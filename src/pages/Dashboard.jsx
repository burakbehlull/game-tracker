import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Gamepad2, Clock, Calendar, TrendingUp } from 'lucide-react';

export default function Dashboard({ user }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
      updateCurrentGame();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [sessionsData, statsData] = await Promise.all([
          window.electronAPI.getGameSessions(),
          window.electronAPI.getGameStats()
        ]);
        setSessions(sessionsData);
        setStats(statsData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const updateCurrentGame = async () => {
    try {
      if (window.electronAPI) {
        const game = await window.electronAPI.getCurrentGame();
        setCurrentGame(game);
      }
    } catch (error) {
      console.error('Mevcut oyun bilgisi hatası:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 dk';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} sa ${minutes} dk`;
    } else if (minutes > 0) {
      return `${minutes} dk`;
    } else {
      return `${seconds} sn`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR');
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hoş Geldiniz, {user?.username}!</h1>
        <p className="text-muted-foreground mt-2">Oyun sürelerinizi takip edin ve istatistiklerinizi görüntüleyin</p>
      </div>

      {currentGame && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Şu Anda Oynanan
              </CardTitle>
              <span className="text-sm text-primary font-semibold animate-pulse">● Canlı</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold capitalize">{currentGame.gameName}</div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(currentGame.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(currentGame.startTime)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">İstatistikler</TabsTrigger>
          <TabsTrigger value="sessions">Oturumlar</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="capitalize">{stat._id}</CardTitle>
                  <CardDescription>Oyun İstatistikleri</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{formatDuration(stat.totalTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{stat.sessionCount} oturum</span>
                  </div>
                  {stat.lastPlayed && (
                    <div className="text-xs text-muted-foreground">
                      Son oynanma: {formatDate(stat.lastPlayed)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {stats.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Henüz oyun kaydı yok
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session._id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold capitalize">{session.gameName}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate(session.startTime)} - {formatDate(session.endTime)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{formatDuration(session.duration)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sessions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Henüz oturum kaydı yok
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

