import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Clock, Zap, Users, Monitor, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { getAssetUrl } from '../lib/assetHelper';


export default function GameDetails() {
  const { gameName } = useParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameDetails();
  }, [gameName]);

  const loadGameDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getGameDetails(gameName);
      setPlayers(data);
    } catch (error) {
      console.error('Oyun detayları yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGameImage = (name) => {
    if (!name) return null;
    const fileName = name.toLowerCase().replace(/\s+/g, '_');
    return getAssetUrl(`assets/games/${fileName}_banner.jpg`);
  };


  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}s ${m}d`;
    return `${m} dakika`;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner Section */}
      <div className="relative h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={getGameImage(gameName)} 
            alt={gameName}
            className="w-full h-full object-cover"
            onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        
        <div className="container max-w-6xl mx-auto h-full relative z-10 flex flex-col justify-end pb-12 px-4">
           <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-left duration-500">
              <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                Popüler Oyun
              </span>
           </div>
           <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-4 animate-in slide-in-from-left duration-700">
              {gameName}
           </h1>
           <div className="flex items-center gap-6 text-sm font-bold text-gray-400 uppercase tracking-widest animate-in slide-in-from-left duration-1000">
              <div className="flex items-center gap-2">
                 <Users className="w-4 h-4 text-blue-400" />
                 {players.length} Oyuncu
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <div className="flex items-center gap-2">
                 <Zap className="w-4 h-4 text-yellow-400" />
                 Aktif Takip
              </div>
           </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0d1117] border border-white/5 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">
                       <Trophy className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">En Çok Oynayanlar</h2>
                 </div>
              </div>

              <div className="space-y-3">
                {players.length > 0 ? (
                  players.map((p, i) => (
                    <Link 
                        to={`/profile/${p.user.username}`}
                        key={p._id} 
                        className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center text-sm font-black text-gray-500 italic">
                           #{i + 1}
                        </div>
                        <div className="relative">
                           <div className="w-12 h-12 rounded-xl bg-black border border-white/10 p-0.5 overflow-hidden">
                              <img 
                                src={p.user.avatar || `https://placehold.co/100x100/2a2a2a/FFF?text=${p.user.username[0]}`} 
                                alt={p.user.username} 
                                className="w-full h-full object-cover rounded-lg"
                              />
                           </div>
                           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-[#0d1117] flex items-center justify-center text-[10px] font-black text-white">
                              {p.user.level}
                           </div>
                        </div>
                        <div>
                          <div className="text-base font-black text-white group-hover:text-primary transition-colors">
                            {p.user.globalName || p.user.username}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                             {p.user.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                           <div className="text-lg font-black text-white">{formatTotalTime(p.totalTime)}</div>
                           <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-right">OYNAMA SÜRESİ</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-20 text-center">
                     <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Bu oyunu henüz kimse takip etmedi</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Info */}
          <div className="space-y-6">
             <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 shadow-xl shadow-blue-500/10">
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                   <Monitor className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Sistem Hakkında</h3>
                <p className="text-blue-100 text-xs font-medium leading-relaxed opacity-80">
                   Bu sıralama tüm kullanıcılarımızın anlık oyun verilerinden oluşturulmaktadır. Sende kendi oyun sürelerini takip etmek istiyorsan Game Tracker'ı açık tutman yeterli!
                </p>
             </div>

             <div className="bg-[#0d1117] border border-white/5 rounded-[2.5rem] p-8">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">En Çok İlgi Çekenler</h3>
                <div className="space-y-4">
                   <Link to="/games/Valorant" className="block text-sm font-bold text-gray-300 hover:text-white transition-colors">VALORANT</Link>
                   <Link to="/games/Minecraft" className="block text-sm font-bold text-gray-300 hover:text-white transition-colors">MINECRAFT</Link>
                   <Link to="/games/League of Legends" className="block text-sm font-bold text-gray-300 hover:text-white transition-colors">LEAGUE OF LEGENDS</Link>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
