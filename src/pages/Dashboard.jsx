import { useState, useEffect, useMemo, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../components/ui/toaster';
import { Gamepad2, Clock, Calendar, TrendingUp, AlertCircle, Moon, 
  Sun, Sunset, Coffee, Zap, Brain, ShieldCheck, Target, Trophy, CheckCircle2, Star } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

// Simplified Chart Component (since we can't install recharts easily)
const MiniBarChart = memo(({ data, color = '#3b82f6' }) => {
  const max = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  return (
    <div className="flex items-end gap-1 h-24 mt-4 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div 
            className="w-full rounded-t-sm transition-all duration-500 hover:brightness-125" 
            style={{ 
              height: `${(d.value / max) * 100}%`, 
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}44`
            }}
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
            {d.label}: {d.value}
          </div>
          <span className="text-[8px] text-gray-600 mt-1 uppercase font-bold">{d.label.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
});

export default function Dashboard({ user }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [isAdmin, setIsAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sessionLimit, setSessionLimit] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState('');
  const [insights, setInsights] = useState({
    habit: "Analiz ediliyor...",
    message: "Oyun verilerin toplandıkça burası şenlenecek.",
    icon: <Brain className="w-4 h-4 text-purple-400" />
  });
  const [healthAlerts, setHealthAlerts] = useState([]);
  const [activeUser, setActiveUser] = useState(user);

  // Sync with prop if it changes
  useEffect(() => {
    setActiveUser(user);
  }, [user]);

  // Initial Data Load
  useEffect(() => {
    loadData();
    checkAdmin();

    // Refresh data periodically
    const dataInterval = setInterval(loadData, 60000);
    return () => clearInterval(dataInterval);
  }, []);

  // Poll for Current Game Status (every 3s)
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

    checkGame(); // immediate
    const gameInterval = setInterval(checkGame, 3000);
    return () => clearInterval(gameInterval);
  }, []);

  const handleSetLimit = async () => {
    const mins = parseInt(limitMinutes);
    if (isNaN(mins) || mins < 0) return;
    
    if (window.electronAPI) {
      await window.electronAPI.setSessionLimit(mins);
      setSessionLimit(mins);
      toast({ title: 'Limit Ayarlandı', description: `Oturum limiti ${mins} dakika olarak ayarlandı.` });
    }
  };

  // Live Timer Effect (runs every 1s only when a game is active)
  useEffect(() => {
    let timer;
    if (currentGame?.startTime) {
      const start = new Date(currentGame.startTime).getTime();
      
      // Update immediately
      setLiveDuration(Math.floor((Date.now() - start) / 1000));

      timer = setInterval(() => {
        const now = Date.now();
        const seconds = Math.floor((now - start) / 1000);
        setLiveDuration(seconds);
      }, 1000);
    } else {
      setLiveDuration(0);
    }

    return () => clearInterval(timer);
  }, [currentGame?.startTime]); // Only restart if game triggers a new start time

  const checkAdmin = async () => {
    if (window.electronAPI) {
      const adminStatus = await window.electronAPI.checkAdminStatus();
      setIsAdmin(adminStatus);
    }
  };

  const loadData = async () => {
    try {
      const [sessionsData, statsData, challengesData, userData] = await Promise.all([
        api.getSessions(),
        api.getStats(),
        api.getChallenges(),
        api.getCurrentUser()
      ]);
      
      // Normalize stats by merging same games with different casing
      const normalizedStats = statsData.reduce((acc, stat) => {
        const name = stat._id.toLowerCase();
        const existing = acc.find(s => s._id.toLowerCase() === name);
        if (existing) {
          existing.totalTime += stat.totalTime;
          existing.sessionCount += stat.sessionCount;
          if (new Date(stat.lastPlayed) > new Date(existing.lastPlayed)) {
            existing.lastPlayed = stat.lastPlayed;
          }
        } else {
          acc.push({ ...stat });
        }
        return acc;
      }, []).sort((a, b) => {
        const dateA = a.lastPlayed ? new Date(a.lastPlayed) : new Date(0);
        const dateB = b.lastPlayed ? new Date(b.lastPlayed) : new Date(0);
        return dateB - dateA;
      });

      setSessions(sessionsData);
      setStats(normalizedStats);
      setChallenges(challengesData || []);
      setActiveUser(userData);
      generateInsights(sessionsData);
      checkHealthIssues(sessionsData);
      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const generateInsights = (data) => {
    if (!data || data.length === 0) return;

    // Night session check
    const nightSessions = data.filter(s => s.isNightSession).length;
    const weekendSessions = data.filter(s => s.dayOfWeek === 0 || s.dayOfWeek === 6).length;
    
    if (nightSessions > data.length * 0.4) {
      setInsights({
        habit: "Gece Kuşu",
        message: "En çok gece oynamayı seviyorsun.",
        icon: <Moon className="w-4 h-4 text-blue-400" />
      });
    } else if (weekendSessions > data.length * 0.5) {
      setInsights({
        habit: "Hafta Sonu Savaşçısı",
        message: "Hafta sonları maratonlara hazırsın.",
        icon: <Zap className="w-4 h-4 text-yellow-400" />
      });
    } else {
      setInsights({
        habit: "Düzenli Oyuncu",
        message: "Oyun saatlerin oldukça dengeli.",
        icon: <Brain className="w-4 h-4 text-purple-400" />
      });
    }
  };

  const checkHealthIssues = (data) => {
    const alerts = [];
    const now = new Date();
    
    // Geç saat uyarısı
    if (now.getHours() >= 23 || now.getHours() <= 5) {
      alerts.push({
        type: 'warning',
        title: 'Gece Geç Oldu',
        message: 'Uyku verimliliğini korumak için mola verebilirsin.',
        icon: <Moon className="w-4 h-4" />
      });
    }

    // Bugün çok oynamış mı? (Sadece bugünkü sessionları topla)
    const today = now.toLocaleDateString();
    const todaySessions = data.filter(s => new Date(s.startTime).toLocaleDateString() === today);
    const todayTotal = todaySessions.reduce((acc, s) => acc + s.duration, 0);

    if (todayTotal > 6 * 3600) { // 6 saat
      alerts.push({
        type: 'alert',
        title: 'Oyun Yorgunluğu',
        message: 'Bugün 6 saatten fazla oynadın, gözlerini dinlendir.',
        icon: <Coffee className="w-4 h-4" />
      });
    }

    setHealthAlerts(alerts);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) {
      parts.push(`${h} sa`);
      if (m > 0) parts.push(`${m} dk`);
    } else {
      if (m > 0) parts.push(`${m} dk`);
      if (s > 0 || parts.length === 0) parts.push(`${s} sn`);
    }

    return parts.join(' ');
  };

  const formatStartTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 animate-pulse">Veriler yükleniyor...</div>;
  }

  return (
    <div className="relative min-h-full pb-12">
      {/* Optimized Background: CSS gradient is cheaper than heavy blurry divs */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

      <div className="container max-w-6xl mx-auto pt-10 px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              {(() => {
                const hour = new Date().getHours();
                if (hour >= 6 && hour < 12) return <><Sun className="w-8 h-8 text-amber-400" /> Günaydın</>;
                if (hour >= 12 && hour < 13) return <><Sun className="w-8 h-8 text-yellow-400" /> İyi Günler</>;
                if (hour >= 13 && hour < 23) return <><Sunset className="w-8 h-8 text-orange-400" /> İyi Akşamlar</>;
                return <><Moon className="w-8 h-8 text-blue-400" /> İyi Geceler</>;
              })()}, <span className="text-primary">{user?.username}</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Oyun aktiviteleriniz takip ediliyor.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {activeUser && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Level {activeUser.level || 1}</span>
                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                      style={{ width: `${(activeUser.xp % 1000) / 10}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-gray-500 font-bold uppercase">{activeUser.xp || 0} XP</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               Sistem Aktif
            </div>
          </div>
        </div>

        {/* Health & Insights Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI Insights Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 backdrop-blur-xl relative overflow-hidden group">
             <Brain className="absolute -right-4 -bottom-4 w-32 h-32 text-purple-500/5 rotate-12 group-hover:scale-110 transition-transform" />
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                 {insights.icon}
               </div>
               <h3 className="text-lg font-bold text-white">Profil Özetin</h3>
             </div>
             <p className="text-2xl font-black text-white mb-1 tracking-tight">{insights.habit}</p>
             <p className="text-sm text-gray-400 font-medium">{insights.message}</p>
          </div>

          {/* Health Alerts Card */}
          <div className="space-y-3">
            {healthAlerts.length > 0 ? healthAlerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 animate-in slide-in-from-right duration-500 delay-${i*100} ${
                alert.type === 'alert' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
              }`}>
                <div className="p-2 rounded-lg bg-current/10">
                  {alert.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">{alert.title}</h4>
                  <p className="text-[11px] opacity-80 font-medium">{alert.message}</p>
                </div>
              </div>
            )) : (
              <div className="p-6 rounded-2xl bg-[#0B1120]/50 border border-emerald-500/20 text-emerald-500 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">Durum Harika</h4>
                  <p className="text-[11px] opacity-80 font-medium">Sağlık uyarıları temiz. Keyifli oyunlar!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Warning */}
        {!isAdmin && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-tight">Yönetici Modu Gerekli</span>
            </div>
            <p className="text-[11px] font-medium opacity-80">Bazı oyunları (Valorant vb.) tam takip etmek için yönetici izni gerekir.</p>
          </div>
        )}

        {/* Live Game Card - Optimized */}
        {currentGame ? (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-blue-500/30 bg-[#0B1120] shadow-lg shadow-blue-900/10">
            {/* Background Image/Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10"></div>
            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-blue-400/80 tracking-[0.2em] uppercase">ŞU ANDA AKTİF</span>
                </div>
                <div className="flex items-center gap-3">
                   <Link to="/timer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                      <Clock className="w-3.5 h-3.5" />
                      Limit Ayarla
                   </Link>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="flex-1 text-center md:text-left min-w-0">
                    <div className={cn(
                      "font-black text-white mb-4 tracking-tighter uppercase truncate drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300",
                      currentGame.gameName.length <= 9 ? "text-5xl md:text-8xl" : 
                      currentGame.gameName.length <= 15 ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"
                    )}>
                      {currentGame.gameName}
                    </div>
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                       <div className="px-4 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm">
                         Oturum Açık
                       </div>
                    </div>
                 </div>
                 
                  <div className="flex gap-6 items-center shrink-0">
                    <div className="px-10 py-7 rounded-[2rem] bg-black/40 border border-white/5 min-w-[180px] text-center backdrop-blur-xl group-hover:border-white/10 transition-all shadow-2xl">
                       <div className="text-[10px] text-gray-500 mb-2 font-black uppercase tracking-[0.2em]">Geçen Süre</div>
                       <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">{formatDuration(liveDuration)}</div>
                    </div>
                    <div className="px-10 py-7 rounded-[2rem] bg-black/40 border border-white/5 min-w-[180px] text-center backdrop-blur-xl group-hover:border-white/10 transition-all shadow-2xl">
                       <div className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Başlangıç</div>
                       <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">{formatStartTime(currentGame.startTime)}</div>
                    </div>
                  </div>
              </div>
            </div>
            {/* Animated Progress Underline */}
            <div className="h-2 w-full bg-blue-900/20">
               <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 w-full animate-[pulse_3s_infinite] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
            </div>
          </div>
        ) : (
          <div className="mb-12 p-12 rounded-[3rem] border border-white/5 bg-white/[0.01] text-center backdrop-blur-sm relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <div className="w-24 h-24 rounded-[2rem] bg-white/5 mx-auto mb-6 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-all duration-500">
              <Gamepad2 className="w-12 h-12 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-gray-500 uppercase tracking-tighter">Şu An Oyun Algılanmadı</h3>
            <p className="text-gray-600 text-sm mt-2 max-w-sm mx-auto font-medium">Uyumlu bir oyun başlattığında AI destekli takip sistemin otomatik olarak devreye girecek.</p>
          </div>
        )}

        {/* Stats & History & Challenges Tabs */}
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="bg-black/20 p-1 rounded-full border border-white/5">
            <TabsTrigger value="stats" className="rounded-full px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">İstatistikler</TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-full px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Görevler</TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-full px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Geçmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Analytics Graphs Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Weekly Activity Card */}
              <div className="col-span-1 md:col-span-2 p-6 rounded-[2rem] border border-white/5 bg-[#0d1117] relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-primary" />
                     Haftalık Aktivite
                   </h3>
                   <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">Süre (Dk)</span>
                </div>
                <MiniBarChart data={[
                  { label: 'Pzt', value: sessions.filter(s => s.dayOfWeek === 1).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Sal', value: sessions.filter(s => s.dayOfWeek === 2).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Çar', value: sessions.filter(s => s.dayOfWeek === 3).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Per', value: sessions.filter(s => s.dayOfWeek === 4).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Cum', value: sessions.filter(s => s.dayOfWeek === 5).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Cmt', value: sessions.filter(s => s.dayOfWeek === 6).reduce((acc,s)=>acc+s.duration,0)/60 },
                  { label: 'Paz', value: sessions.filter(s => s.dayOfWeek === 0).reduce((acc,s)=>acc+s.duration,0)/60 },
                ]} color="#3b82f6" />
              </div>

               {/* Time Distribution Card */}
               <div className="p-6 rounded-[2rem] border border-white/5 bg-[#0d1117]">
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Zaman Dağılımı
                 </h3>
                 <div className="space-y-4">
                    {(() => {
                      const total = sessions.length || 1;
                      const stats = [
                        { label: 'SABAH', color: 'bg-amber-500', icon: <Sun className="w-3 h-3" />, key: 'sabah' },
                        { label: 'GÜNDÜZ', color: 'bg-yellow-400', icon: <Sun className="w-3 h-3" />, key: 'öğle' },
                        { label: 'AKŞAM', color: 'bg-orange-500', icon: <Sunset className="w-3 h-3" />, key: 'akşam' },
                        { label: 'GECE', color: 'bg-blue-500', icon: <Moon className="w-3 h-3" />, key: 'gece' }
                      ];

                      return stats.map((time, idx) => {
                        const count = sessions.filter(s => {
                          // Use timeOfDay if available, otherwise calculate from startHour
                          if (s.timeOfDay) return s.timeOfDay === time.key;
                          
                          const h = s.startHour !== undefined ? s.startHour : new Date(s.startTime).getHours();
                          let calculated = 'gece';
                          if (h >= 6 && h < 12) calculated = 'sabah';
                          else if (h >= 12 && h < 18) calculated = 'öğle';
                          else if (h >= 18 && h < 23) calculated = 'akşam';
                          return calculated === time.key;
                        }).length;
                        const pct = Math.round((count / total) * 100);

                        return (
                          <div key={idx}>
                             <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 mb-1.5"> 
                               <span className="flex items-center gap-1">{time.icon} {time.label}</span>
                               <span>%{pct}</span>
                             </div>
                             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${time.color}`} style={{ width: `${pct}%` }} />
                             </div>
                          </div>
                        );
                      });
                    })()}
                 </div>
               </div>
            </div>


            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={index} className="group rounded-[2rem] border border-white/5 bg-[#0d1117] p-8 hover:border-primary/30 transition-all duration-300 hover:translate-y-[-4px]">
                  <div className="flex justify-between items-start mb-6">
                     <Link to={`/games/${stat._id}`} className="hover:opacity-80 transition-opacity min-w-0 flex-1">
                        <h3 className="text-2xl font-black text-white capitalize truncate pr-4 drop-shadow-lg transition-colors group-hover:text-primary">{stat._id}</h3>
                     </Link>
                     <div className="p-2 rounded-xl bg-white/5 text-gray-400 group-hover:text-primary transition-colors">
                        <TrendingUp className="w-5 h-5" />
                     </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 opacity-60">Toplam Süre</div>
                      <div className="text-4xl font-black text-white tracking-tighter">{formatDuration(stat.totalTime)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <div>
                         <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest opacity-60">Oturum</div>
                         <div className="text-lg font-black text-gray-300">{stat.sessionCount}</div>
                      </div>
                      {stat.lastPlayed && (
                        <div className="text-right">
                           <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest opacity-60">Son Oynama</div>
                           <div className="text-lg font-black text-gray-300">{new Date(stat.lastPlayed).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {stats.length === 0 && (
                 <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                    <Brain className="w-12 h-12 text-gray-800" />
                    <div className="text-gray-500 font-bold uppercase tracking-widest">Henüz analiz edilecek veri bulunamadı.</div>
                 </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="challenges" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid gap-4 md:grid-cols-3">
                {challenges.map((challenge, idx) => (
                  <div key={idx} className={`p-6 rounded-[2rem] border transition-all ${
                    challenge.isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-900/10' : 'bg-[#0d1117] border-white/5'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                       <div className="p-3 rounded-2xl bg-white/5">
                          <Target className={`w-5 h-5 ${challenge.isCompleted ? 'text-emerald-500' : 'text-blue-400'}`} />
                       </div>
                       {challenge.isCompleted ? (
                         <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            TAMAMLANDI ✅
                         </div>
                       ) : (
                         <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AKTİF GÖREV</div>
                       )}
                    </div>
                    
                    <h3 className={`text-xl font-black mb-2 tracking-tight ${challenge.isCompleted ? 'text-white' : 'text-gray-200'}`}>
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-gray-400 mb-6 font-medium leading-relaxed">
                      {challenge.description}
                    </p>

                    <div className="space-y-3">
                       <div className="flex justify-between items-end">
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">İlerleme</div>
                          <div className="text-xs font-black text-white tabular-nums">
                            {challenge.type === 'play_time' || challenge.type === 'steady_play' 
                              ? `${Math.floor(challenge.current)} / ${challenge.goal} DK`
                              : `${challenge.current} / ${challenge.goal}`
                            }
                          </div>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${challenge.isCompleted ? 'bg-emerald-500' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                            style={{ width: `${Math.min(100, (challenge.current / challenge.goal) * 100)}%` }}
                          />
                       </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-amber-500">{challenge.xpReward} XP</span>
                       </div>
                       <Trophy className={`w-4 h-4 ${challenge.isCompleted ? 'text-emerald-500' : 'text-gray-700'}`} />
                    </div>
                  </div>
                ))}
                {challenges.length === 0 && (
                   <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                      <Trophy className="w-12 h-12 text-gray-800" />
                      <div className="text-gray-500 font-bold uppercase tracking-widest">Bugünlük tüm görevler bitti!</div>
                   </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="sessions" className="animate-in fade-in duration-300">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-[#0d1117]/50 hover:bg-[#0d1117] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{session.gameName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.startTime).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">{formatDuration(session.duration)}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

