import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, Monitor, Clock, Trophy, Zap, Eye, EyeOff, LibraryBig, Archive, 
  Heart, Flame, Gamepad2, Swords, TrendingUp, Crown, ShieldCheck, Rocket, Users2, UserPlus, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toaster';
import { api } from '../services/api';
import { getAssetUrl } from '../lib/assetHelper';


export default function Profile({ user: currentUser }) {
  const { username } = useParams();
  const { toast } = useToast();
  
  // If we have a username in URL, we are viewing someone else.
  // If no username (or it matches current), we are viewing ours.
  const isOwnProfile = !username || (currentUser && username === currentUser.username);

  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [communities, setCommunities] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState('none'); // none, pending, accepted
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newGlobalName, setNewGlobalName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Initialize form when user data is available
  useEffect(() => {
    if (currentUser && isOwnProfile) {
       setNewUsername(currentUser.username);
       setNewGlobalName(currentUser.globalName);
    }
  }, [currentUser, isOwnProfile]);

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) return;
    setUpdateLoading(true);
    setEditError('');
    try {
      const updatedUser = await api.updateProfile({ username: newUsername, globalName: newGlobalName });
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

  const handleSendFriendRequest = async () => {
    if (!profileUser || requestLoading) return;
    setRequestLoading(true);
    try {
      await api.sendFriendRequest({ targetUserId: profileUser._id, username: profileUser.username });
      setFriendshipStatus('pending');
      toast({ title: 'İstek Gönderildi', description: `${profileUser.username} kullanıcısına arkadaşlık isteği gönderildi.` });
    } catch (err) {
      toast({ title: 'Hata', description: err.message || 'İstek gönderilemedi' });
    } finally {
      setRequestLoading(false);
    }
  };

  // If we have a username in URL, we are viewing someone else.
  // If no username (or it matches current), we are viewing ours.


  const fetchProfile = async () => {
    setLoading(true);
    try {
      const targetUsername = username || currentUser?.username;
      if (!targetUsername) return;
      
      const userRes = await api.getUserProfile(targetUsername);
      const userData = userRes.user || userRes;
      const userStats = userRes.stats || [];
      
      setProfileUser(userData);
      setStats((userStats || []).sort((a, b) => new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0)));
      setFriendshipStatus(userRes.friendshipStatus || 'none');
      
      const total = userStats.reduce((acc, curr) => acc + curr.totalTime, 0);
      setTotalTime(total);

      const userId = userData._id || userData.id;
      const [badgesRes, commsRes] = await Promise.all([
        api.getAllBadges(),
        userId ? api.getUserCommunities(userId) : Promise.resolve([])
      ]);
      console.log('User Communities:', commsRes);
      setAllBadges(badgesRes || []);
      setCommunities(commsRes || []);
    } catch (err) {
      console.error('Profil yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, currentUser]);

  const badgeIcons = {
    LibraryBig, Archive, Heart, Flame, Gamepad2, Swords, Zap, TrendingUp, Crown, Trophy, ShieldCheck, Rocket
  };

  const handleToggleHideGame = async (gameName) => {
    if (!isOwnProfile) return;
    
    const isCurrentlyHidden = profileUser?.settings?.privacy?.hiddenGames?.includes(gameName);
    const updatedHiddenList = isCurrentlyHidden 
       ? profileUser?.settings?.privacy?.hiddenGames?.filter(g => g !== gameName)
       : [...(profileUser?.settings?.privacy?.hiddenGames || []), gameName];
    
    // Simple state update - better for single page
    setProfileUser(prev => ({
       ...prev,
       settings: { 
         ...prev.settings, 
         privacy: { 
           ...(prev.settings?.[ 'privacy' ] || {}), 
           hiddenGames: updatedHiddenList 
         } 
       }
    }));

    try {
       await api.updateProfile({ 
          settings: { 
             privacy: { 
                ...(profileUser.settings?.[ 'privacy' ] || {}), 
                hiddenGames: updatedHiddenList 
             } 
          } 
       });
       // we don't reload to preserve UX, state is already updated
    } catch (err) {
       console.error('Gizlilik ayarı güncellenemedi:', err);
    }
  };

  const formatTotalHours = (seconds) => {
    if (!seconds && seconds !== 0) return '0 saniye';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h} saat ${m} dakika`;
    } else if (m > 0) {
      return `${m} dakika ${s} saniye`;
    } else {
      return `${s} saniye`;
    }
  };

   const formatTotalHours2 = (seconds) => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} saat`;
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Hiç oynanmadı';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getGameImage = (gameName) => {
    if (!gameName) return null;
    
    // Normalize name for filename (lowercase, spaces to underscores)
    const fileName = gameName.toLowerCase().replace(/\s+/g, '_');
    
    // Check for common extensions - in a real app you might have a map, 
    // but here we'll assume they follow a pattern or just try to load
    return getAssetUrl(`assets/games/${fileName}_banner.jpg`);
  };


  if (loading && !profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Profil Yükleniyor</p>
        </div>
      </div>
    );
  }

  if (!profileUser && !loading) {
     return (
        <div className="min-h-screen flex items-center justify-center">
           <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Kullanıcı bulunamadı</h2>
              <Link to="/" className="text-blue-500 hover:underline">Ana sayfaya dön</Link>
           </div>
        </div>
     )
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
                  {profileUser?.level || 1}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl font-black text-foreground tracking-tight lowercase">{profileUser?.globalName || profileUser?.username}</h1>
                 {/* <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                    PRO
                  </span>*/}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {/*<span className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    PC Gamer
                  </span>
                  */}
                  {/*<span className="w-1 h-1 rounded-full bg-white/20" />*/}
                  <span className="lowercase">@{profileUser?.username}</span>
                  {/*<span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-blue-500/80">User ID: {profileUser?.id}</span>*/}
                </div>
              </div>

                
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwnProfile ? (
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
                              <label className="text-sm font-medium text-gray-300">Kullanıcı Adınız</label>
                              <input 
                                type="text" 
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Yeni kullanıcı adı"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-300">Görünen Adınız</label>
                              <input 
                                type="text" 
                                value={newGlobalName}
                                onChange={(e) => setNewGlobalName(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Yeni görünen adınız"
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
                ) : (
                  <>
                    {friendshipStatus === 'accepted' ? (
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 h-11 px-6 rounded-xl transition-all cursor-default">
                        <ShieldCheck className="w-4 h-4" />
                        Arkadaş Ekli
                      </Button>
                    ) : friendshipStatus === 'pending' ? (
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 h-11 px-6 rounded-xl transition-all cursor-default">
                        <Clock className="w-4 h-4" />
                        İstek Atıldı
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSendFriendRequest}
                        disabled={requestLoading}
                        className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 h-11 px-6 rounded-xl transition-all"
                      >
                        {requestLoading ? <Rocket className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Arkadaş Ekle
                      </Button>
                    )}
                    <Link to={`/chat`}>
                      <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6 rounded-xl">
                        <MessageSquare className="w-4 h-4" />
                        Mesaj
                      </Button>
                    </Link>
                  </>
                )}
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
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d1117] p-5 transition-all duration-300 hover:bg-[#161b22]"
                  >
                    <div className="flex items-center gap-6">
                      {/* Game Art */}
                      <div className="relative shrink-0 w-40 h-24 rounded-xl bg-[#0d1117] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/20 group-hover:shadow-primary/5">
                        {getGameImage(stat._id) ? (
                            <img 
                                src={getGameImage(stat._id)} 
                                alt={stat._id}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className={cn(
                            "absolute inset-0 flex items-center justify-center p-4 bg-[#0d1117] text-center",
                            getGameImage(stat._id) ? "hidden" : "flex"
                        )}>
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter leading-tight">{stat._id}</span>
                        </div>
                        {getGameImage(stat._id) && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        )}
                      </div>
 
                      {/* Info */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-4">
                               <Link to={`/games/${stat._id}`} className="hover:opacity-80 transition-opacity">
                                 <h3 className="font-black text-2xl text-white group-hover:text-blue-400 transition-colors truncate max-w-full">
                                   {stat._id}
                                 </h3>
                               </Link>
                               {profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) && (
                                  <span className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-red-500/10">
                                     <EyeOff className="w-2 h-2" /> Gizli
                                  </span>
                               )}
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md border border-yellow-500/10">
                                <Trophy className="w-3 h-3" /> 
                                1/1 Başarım
                              </span>
                              <span className="flex items-center gap-1.5 ">
                                <Clock className="w-3 h-3" />
                                Son: {formatLastPlayed(stat.lastPlayed)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-3">
                            <span className="text-2xl font-black text-white">
                              {formatTotalHours(stat.totalTime)}
                            </span>
                            {isOwnProfile && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleHideGame(stat._id)}
                                title={profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) ? 'Oyunu Görünür Yap' : 'Oyunu Gizli Yap'}
                                className={cn(
                                  "h-8 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest border border-white/5",
                                  profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) 
                                    ? "text-emerald-500 hover:text-emerald-400" 
                                    : "text-gray-500 hover:text-white"
                                )}
                              >
                                {profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) ? (
                                  <><Eye className="w-3.5 h-3.5 mr-2" /> Görünür Yap</>
                                ) : (
                                  <><EyeOff className="w-3.5 h-3.5 mr-2" /> Gizli Yap</>
                                )}
                              </Button>
                            )}
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
            <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">İstatistikler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-4xl font-black text-white">{stats.length}</div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">Oyun</div>
                </div>
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-4xl font-black text-white">{formatTotalHours2(totalTime)}</div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">Toplam Süre</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rozetler</h3>
                <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                  {profileUser?.badges?.length || 0} Kazanıldı
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {allBadges.filter(badge => profileUser?.badges?.includes(badge.id)).map((badge) => {
                  const Icon = badgeIcons[badge.icon] || Trophy;
                  
                  return (
                    <div 
                      key={badge.id}
                      title={`${badge.title}: ${badge.description}`}
                      className={cn(
                        "group relative aspect-square rounded-2xl flex items-center justify-center transition-all duration-300",
                        `bg-gradient-to-br ${badge.color} shadow-lg cursor-pointer hover:scale-110 active:scale-95`
                      )}
                    >
                      <Icon className="w-7 h-7 text-white drop-shadow-md" />
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-[10px] w-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                        <div className="font-black text-white mb-1 uppercase tracking-widest">{badge.title}</div>
                        <div className="text-gray-400 font-medium leading-tight">{badge.description}</div>
                      </div>
                    </div>
                  );
                })}
                {(profileUser?.badges?.length || 0) === 0 && (
                  <div className="col-span-4 py-4 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Henüz rozet kazanılmadı</p>
                  </div>
                )}
              </div>
            </div>

            {/* Groups/Community */}
            <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Topluluklar</h3>
                 <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">
                   {communities.length} Katılım
                 </span>
               </div>
               
               <div className="space-y-4">
                 {communities.map((community) => (
                   <Link key={community._id} to={`/community/${community.slug}`} className="flex items-center gap-4 group cursor-pointer">
                     <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0 overflow-hidden">
                       {community.avatar ? (
                         <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                       ) : (
                         <Users2 className="w-5 h-5" />
                       )}
                     </div>
                     <div className="min-w-0">
                       <div className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors truncate lowercase">
                         {community.name}
                       </div>
                       <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                         {community.memberCount || 0} Üye
                       </div>
                     </div>
                   </Link>
                 ))}
                 {communities.length === 0 && (
                   <div className="text-center py-4">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Henüz bir topluluğa katılmadı</p>
                   </div>
                 )}
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


