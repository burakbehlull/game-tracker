import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, MessageSquare, Award, Monitor, Clock, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { api } from '../services/api';

export default function Profile({ user: currentUser }) {
  const { username } = useParams();
  
  // If we have a username in URL, we are viewing someone else.
  // If no username (or it matches current), we are viewing ours.
  const isOwnProfile = !username || (currentUser && username === currentUser.username);

  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Initialize form when user data is available
  useEffect(() => {
    if (currentUser && isOwnProfile) {
       setNewUsername(currentUser.username);
    }
  }, [currentUser, isOwnProfile]);

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) return;
    setUpdateLoading(true);
    setEditError('');
    try {
      const updatedUser = await api.updateProfile({ username: newUsername });
      setProfileUser(updatedUser);
      // Reload page or force update to reflect changes globally if needed
      // Ideally, we should update app-level user state, but window reload is safer for now to sync everything
      window.location.reload(); 
    } catch (error) {
      setEditError(error.error || 'Güncelleme başarısız');
    } finally {
      setUpdateLoading(false);
    }
  };

  // If we have a username in URL, we are viewing someone else.
  // If no username (or it matches current), we are viewing ours.


  useEffect(() => {
    loadProfile();
  }, [username, currentUser]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (isOwnProfile && currentUser) {
        // Load own stats
        setProfileUser(currentUser);
        await loadStats();
      } else if (username) {
        // Load public profile
        const data = await api.getUserProfile(username);
        setProfileUser(data.user);
        processStats(data.stats);
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
     const statsData = await api.getStats();
     processStats(statsData);
  };

  const processStats = (statsData) => {
    if (!statsData) return;
    statsData.sort((a, b) => {
      const dateA = a.lastPlayed ? new Date(a.lastPlayed) : new Date(0);
      const dateB = b.lastPlayed ? new Date(b.lastPlayed) : new Date(0);
      return dateB - dateA;
    });
    setStats(statsData);
    const total = statsData.reduce((sum, stat) => sum + stat.totalTime, 0);
    setTotalTime(total);
  };

  const formatTotalHours = (seconds) => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} saat`;
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Hiç oynanmadı';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getGameImage = (gameName) => {
    return `https://placehold.co/600x400/1a1a1a/FFF?text=${encodeURIComponent(gameName)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-primary font-medium">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-12">
      {/* Optimized Background - Removed heavy blur/glow layers */}
      <div className="fixed inset-0 bg-background -z-10" />
      
      <div className="container max-w-6xl mx-auto pt-16 px-4 relative z-10">
        
        {/* Profile Header - Optimized */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-xl bg-black/40 mb-8 group">
          {/* Header Banners - Removed Noise SVG */}
          <div className="h-48 w-full bg-gradient-to-r from-blue-900/40 to-purple-900/40 relative">
            
            {/* Online Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-medium text-white/90">Çevrimiçi</span>
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-6 relative">
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-32 h-32 rounded-2xl p-1 bg-black/50 border border-white/10 shadow-xl">
                  <img 
                    src="https://placehold.co/128x128/2a2a2a/FFF?text=Avatar" 
                    alt="Avatar" 
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 border-2 border-background shadow-lg flex items-center justify-center font-bold text-white text-sm">
                  4
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">{profileUser?.username}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-4 h-4" />
                    PC Gamer
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{profileUser?.email}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-primary/80">User ID: #82910</span>
                </div>
              </div>

                {/* Actions */}
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwnProfile && (
                  <>
                    <Button 
                      onClick={() => setIsEditModalOpen(true)}
                      variant="outline" 
                      className="bg-white/5 border-white/10 hover:bg-white/10 gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Düzenle
                    </Button>
                    
                    {/* Edit Profile Modal */}
                    {isEditModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                          >
                            ✕
                          </button>
                          
                          <h2 className="text-xl font-bold mb-1">Profili Düzenle</h2>
                          <p className="text-sm text-muted-foreground mb-6">Kullanıcı bilgilerinizi güncelleyin.</p>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-300">Kullanıcı Adı</label>
                              <input 
                                type="text" 
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Yeni kullanıcı adı"
                              />
                            </div>
                            
                            {editError && <div className="text-sm text-red-400">{editError}</div>}
                            
                            <div className="flex justify-end gap-3 pt-2">
                              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                                İptal
                              </Button>
                              <Button onClick={handleUpdateProfile} disabled={updateLoading}>
                                {updateLoading ? 'Kaydediliyor...' : 'Kaydet'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Mesaj
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          
          {/* Main Content - Activity Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Son Aktiviteler
              </h2>
              <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-white/5">
                Son 2 haftada {formatTotalHours(totalTime)}
              </span>
            </div>

            <div className="space-y-4">
              {stats.length > 0 ? (
                stats.map((stat, i) => (
                  <div 
                    key={stat._id} 
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-white/10 hover:shadow-md hover:translate-x-1 will-change-transform"
                  >
                    <div className="flex gap-5">
                      {/* Game Art */}
                      <div className="relative shrink-0 w-32 h-20 rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-300">
                        <img 
                          src={getGameImage(stat._id)} 
                          alt={stat._id}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {stat._id}
                          </h3>
                          <div className="text-right shrink-0">
                            <span className="block text-xl font-bold text-foreground">
                              {formatTotalHours(stat.totalTime)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded">
                              <Trophy className="w-3 h-3 text-yellow-500" /> 
                              1/1 Başarım
                            </span>
                            <span className="flex items-center gap-1.5 ">
                              <Clock className="w-3 h-3" />
                              Son: {formatLastPlayed(stat.lastPlayed)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/5">
                  <p className="text-muted-foreground">Henüz oyun aktivitesi bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats Card */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">İstatistikler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-2xl font-bold text-foreground">{stats.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Oyun</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-2xl font-bold text-foreground">{formatTotalHours(totalTime)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Toplam Süre</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rozetler</h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">3 Yeni</span>
              </div>
              
              <div className="flex gap-2 text-white">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md flex items-center justify-center font-bold text-sm hover:scale-105 transition-transform cursor-pointer">
                  5+
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-md flex items-center justify-center font-bold text-[10px] hover:scale-105 transition-transform cursor-pointer">
                  2025
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md flex items-center justify-center font-bold text-sm hover:scale-105 transition-transform cursor-pointer">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>

            {/* Groups/Community */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
               <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Topluluklar</h3>
               <div className="flex items-center gap-3 p-2 -mx-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                   <Monitor className="w-5 h-5" />
                 </div>
                 <div>
                   <div className="font-medium text-sm group-hover:text-primary transition-colors">Son Minikkıraft Bükücüler</div>
                   <div className="text-xs text-muted-foreground">1.2k Üye</div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


