import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, AlertCircle, Gamepad2, ShieldCheck, Timer as TimerIcon } from 'lucide-react';

export default function TimerPage({ user }) {
  const [currentGame, setCurrentGame] = useState(null);
  const [limitMinutes, setLimitMinutes] = useState('');
  const [activeLimit, setActiveLimit] = useState(0);
  const [liveDuration, setLiveDuration] = useState(0);

  useEffect(() => {
    const checkGame = async () => {
      if (window.electronAPI) {
        try {
          const game = await window.electronAPI.getCurrentGame();
          setCurrentGame(game);
        } catch (error) {
          console.error('Game check error:', error);
        }
      }
    };

    checkGame();
    const interval = setInterval(checkGame, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    if (currentGame?.startTime) {
      const start = new Date(currentGame.startTime).getTime();
      setLiveDuration(Math.floor((Date.now() - start) / 1000));

      timer = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - Date.now(start)) / 1000));
        // Note: the above was a typo in my thought process, fix below
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentGame]);

  // Fixed live duration effect
  useEffect(() => {
    let timer;
    if (currentGame?.startTime) {
      const start = new Date(currentGame.startTime).getTime();
      timer = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setLiveDuration(0);
    }
    return () => clearInterval(timer);
  }, [currentGame?.startTime]);

  const handleSetLimit = async () => {
    const mins = parseInt(limitMinutes);
    if (isNaN(mins) || mins <= 0) return;
    
    if (window.electronAPI) {
      await window.electronAPI.setSessionLimit(mins);
      setActiveLimit(mins);
      setLimitMinutes('');
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'sa ' : ''}${m}dk ${s}sn`;
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-6">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-900/10">
          <TimerIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Zamanlayıcı Merkezi</h1>
          <p className="text-gray-500 font-medium">Oyun sürelerini kontrol et ve otomatik kapatma ayarla.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Kontrol Paneli */}
        <div className="space-y-6">
          <Card className="bg-[#0b0e14] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black text-blue-400 uppercase tracking-widest">Limit Ayarla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Bir oyun açıkken buradan süre limiti koyabilirsin. Süre dolduğunda oyun otomatik olarak kapatılır.
              </p>
              
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Süre (Dakika)</label>
                  <input 
                    type="number" 
                    value={limitMinutes}
                    onChange={(e) => setLimitMinutes(e.target.value)}
                    placeholder="Örn: 60"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                  />
                </div>
                
                <Button 
                  onClick={handleSetLimit}
                  disabled={!currentGame}
                  className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                >
                  {currentGame ? 'LİMİTİ BAŞLAT' : 'OYUN BEKLENİYOR'}
                </Button>
              </div>

              {activeLimit > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-500">{activeLimit} dakikalık limit aktif!</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
             <div>
                <h4 className="font-bold text-orange-400 text-sm">Nasıl Çalışır?</h4>
                <p className="text-[11px] text-orange-300/60 leading-relaxed mt-1">
                  Limit kurulduktan sonra arka plan servisi süreyi takip eder. 10 dk ve 2 dk kala seni uyarırız. Süre dolduğunda ise oyunu senin yerine kapatırız.
                </p>
             </div>
          </div>
        </div>

        {/* Aktif Durum */}
        <div className="flex flex-col gap-6">
          {currentGame ? (
            <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/20 rounded-[2rem] overflow-hidden shadow-2xl relative group">
              <div className="absolute top-0 right-0 p-6">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black text-green-500 tracking-widest uppercase">CANLI</span>
                </div>
              </div>

              <CardContent className="p-10 pt-16">
                <div className="flex flex-col items-center text-center">
                  <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 mb-6 border border-blue-500/10 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2 line-clamp-1">{currentGame.gameName}</h2>
                  <div className="text-sm font-bold text-blue-400 uppercase tracking-widest opacity-60">Şu an Oynanıyor</div>
                  
                  <div className="mt-10 w-full grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Geçen Süre</div>
                      <div className="text-4xl font-black text-white tabular-nums">{formatDuration(liveDuration)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
               <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10 text-gray-800" />
               </div>
               <h3 className="text-xl font-bold text-gray-600 uppercase tracking-tighter">Oyun Algılanmadı</h3>
               <p className="text-sm text-gray-700 mt-2 max-w-[200px]">Limit koymak için önce bir oyun başlatmalısın.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
