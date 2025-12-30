import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Gamepad2, Calendar, Clock, Trophy } from 'lucide-react';

export default function Profile({ user }) {
  const [stats, setStats] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      if (window.electronAPI) {
        const statsData = await window.electronAPI.getGameStats();
        setStats(statsData);
        
        const total = statsData.reduce((sum, stat) => sum + stat.totalTime, 0);
        const sessions = statsData.reduce((sum, stat) => sum + stat.sessionCount, 0);
        setTotalTime(total);
        setTotalSessions(sessions);
        setLoading(false);
      }
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
      setLoading(false);
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
    return new Date(date).toLocaleString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="text-muted-foreground mt-2">{user?.username} hesabınızın detayları</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Toplam Oyun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Farklı oyun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Toplam Süre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatDuration(totalTime)}</div>
            <p className="text-sm text-muted-foreground mt-1">Tüm oyunlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Toplam Oturum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
            <p className="text-sm text-muted-foreground mt-1">Oyun oturumu</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hesap Bilgileri</CardTitle>
          <CardDescription>Kullanıcı hesap detayları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Kullanıcı Adı</span>
            <span className="font-semibold">{user?.username}</span>
          </div>
          {user?.email && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">E-posta</span>
              <span className="font-semibold">{user.email}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Kayıt Tarihi</span>
            <span className="font-semibold">{formatDate(user?.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Oyun Detayları</CardTitle>
            <CardDescription>Her oyun için detaylı istatistikler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold capitalize text-lg">{stat._id}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {stat.sessionCount} oturum
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{formatDuration(stat.totalTime)}</div>
                    {stat.lastPlayed && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(stat.lastPlayed)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

