import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Gamepad2, Clock, Calendar, TrendingUp, AlertCircle, Moon, 
  Sun, Sunset, Coffee, Zap, Brain, ShieldCheck, Target, Trophy, 
  CheckCircle2, Star, Users, Play, Activity, Award, Timer,
  BarChart3, Flame, Crown, Medal, Sparkles, Globe
} from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

// Futuristic Stat Card Component
const FuturisticStatCard = ({ title, value, icon, color = "blue", trend, subtitle }) => {
  const colorClasses = {
    blue: 'from-blue-600/20 to-blue-400/20 border-blue-500/30 text-blue-400',
    green: 'from-green-600/20 to-green-400/20 border-green-500/30 text-green-400',
    purple: 'from-purple-600/20 to-purple-400/20 border-purple-500/30 text-purple-400',
    orange: 'from-orange-600/20 to-orange-400/20 border-orange-500/30 text-orange-400',
    red: 'from-red-600/20 to-red-400/20 border-red-500/30 text-red-400'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl",
      "bg-gradient-to-br p-6",
      colorClasses[color]
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-xl bg-black/20 backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <div className={cn(
              "text-xs font-bold px-2 py-1 rounded-full",
              trend > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {trend > 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight">
            {value}
          </div>
          <div className="text-sm opacity-80 font-medium">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs opacity-60 mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-30" />
    </div>
  );
};

// Futuristic List Component
const FuturisticList = ({ title, items, icon, emptyMessage, color = "blue" }) => {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-600/10',
    green: 'border-green-500/30 bg-green-600/10',
    purple: 'border-purple-500/30 bg-purple-600/10',
    orange: 'border-orange-500/30 bg-orange-600/10'
  };

  return (
    <div className="rounded-2xl border backdrop-blur-xl bg-black/40 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "p-2 rounded-xl bg-gradient-to-br",
          colorClasses[color]
        )}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item._id || item.gameName || index}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                "hover:bg-white/5 hover:scale-[1.02] hover:shadow-lg",
                colorClasses[color]
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-transparent">
                  <span className="text-sm font-bold text-white">#{index + 1}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    {item.gameName || item.username}
                  </div>
                  {item.globalName && item.globalName !== item.username && (
                    <div className="text-sm text-muted-foreground">
                      {item.globalName}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.level && (
                  <div className="text-sm font-bold text-primary">
                    Lv.{item.level}
                  </div>
                )}
                {item.xp && (
                  <div className="text-sm text-muted-foreground">
                    {item.xp.toLocaleString()} XP
                  </div>
                )}
                <div className="text-right">
                  <div className="font-bold text-white">
                    {item.totalHours || (item.totalDuration / 60).toFixed(1)}h
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.sessionCount || 0} oturum
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Dashboard({ user }) {
  const [globalStats, setGlobalStats] = useState(null);
  const [topGamesWeek, setTopGamesWeek] = useState([]);
  const [topGamesMonth, setTopGamesMonth] = useState([]);
  const [activeUsersWeek, setActiveUsersWeek] = useState([]);
  const [activeUsersMonth, setActiveUsersMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGame, setCurrentGame] = useState(null);

  // Load global statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [globalRes, weekGamesRes, monthGamesRes, weekUsersRes, monthUsersRes] = await Promise.all([
          api.get('/stats/global'),
          api.get('/stats/top-games/week'),
          api.get('/stats/top-games/month'),
          api.get('/stats/active-users/week'),
          api.get('/stats/active-users/month')
        ]);

        setGlobalStats(globalRes.data);
        setTopGamesWeek(weekGamesRes.data);
        setTopGamesMonth(monthGamesRes.data);
        setActiveUsersWeek(weekUsersRes.data);
        setActiveUsersMonth(monthUsersRes.data);
      } catch (error) {
        console.error('Stats load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Check current game
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#21262d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 animate-pulse" />
          <div className="text-xl font-bold text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#21262d] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Game Tracker Dashboard
            </h1>
            <p className="text-muted-foreground">
              Gerçek zamanlı oyun istatistikleri ve topluluk verileri
            </p>
          </div>
          {currentGame && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-green-500/30 bg-green-600/10 backdrop-blur-xl">
              <Play className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">{currentGame.gameName}</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Global Stats */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <FuturisticStatCard
            title="Toplam Üye"
            value={globalStats.totalUsers.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            subtitle="Kayıtlı kullanıcı"
          />
          <FuturisticStatCard
            title="Oyun Sayısı"
            value={globalStats.totalUniqueGames.toLocaleString()}
            icon={<Gamepad2 className="w-6 h-6" />}
            color="green"
            subtitle="Farklı oyun"
          />
          <FuturisticStatCard
            title="Toplam Süre"
            value={`${globalStats.totalPlayDays} gün`}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
            subtitle={`${globalStats.totalPlayHours.toLocaleString()} saat`}
          />
          <FuturisticStatCard
            title="Aktif Oyuncu"
            value={activeUsersWeek.length}
            icon={<Activity className="w-6 h-6" />}
            color="orange"
            subtitle="Bu hafta"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Games */}
        <div className="space-y-8">
          <FuturisticList
            title="🔥 Haftanın En Çok Oynanan Oyunları"
            items={topGamesWeek}
            icon={<Flame className="w-5 h-5" />}
            emptyMessage="Bu hafta henüz oyun oynanmadı"
            color="orange"
          />
          
          <FuturisticList
            title="👑 Ayın En Çok Oynanan Oyunları"
            items={topGamesMonth}
            icon={<Crown className="w-5 h-5" />}
            emptyMessage="Bu ay henüz oyun oynanmadı"
            color="purple"
          />
        </div>

        {/* Active Users */}
        <div className="space-y-8">
          <FuturisticList
            title="⚡ Haftanın En Aktif Oyuncuları"
            items={activeUsersWeek}
            icon={<Zap className="w-5 h-5" />}
            emptyMessage="Bu hafta henüz aktif oyuncu yok"
            color="blue"
          />
          
          <FuturisticList
            title="🏆 Ayın En Aktif Oyuncuları"
            items={activeUsersMonth}
            icon={<Trophy className="w-5 h-5" />}
            emptyMessage="Bu ay henüz aktif oyuncu yok"
            color="green"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Veriler her dakika güncellenir</span>
        </div>
        <p className="text-xs">
          Game Tracker © 2026 - Gerçek zamanlı oyun takip sistemi
        </p>
      </div>
    </div>
  );
}
