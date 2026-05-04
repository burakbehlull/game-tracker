import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, Monitor, Clock, Trophy, Zap, Eye, EyeOff, LibraryBig, Archive, 
  Heart, Flame, Gamepad2, Swords, TrendingUp, Crown, ShieldCheck, Rocket, Users2, UserPlus, MessageSquare, Camera, Trash2, Loader2, ExternalLink, X } from 'lucide-react';
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
  const [connectedAccounts, setConnectedAccounts] = useState({});
  const [friendshipStatus, setFriendshipStatus] = useState('none'); // none, pending, accepted
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Hata', description: 'Resim boyutu 2MB\'dan küçük olmalıdır.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setUploadingAvatar(true);
      try {
        const updatedUser = await api.updateProfile({ avatar: base64Data });
        setProfileUser(updatedUser);
        toast({ title: 'Başarılı', description: 'Profil yüklendi.' });
      } catch (err) {
        toast({ title: 'Hata', description: err.message || 'Yükleme başarısız oldu.' });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };
  
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
      
      console.log('[Profile] Profil yükleniyor:', targetUsername);
      const userRes = await api.getUserProfile(targetUsername);
      const userData = userRes.user || userRes;
      const userStats = userRes.stats || [];
      
      console.log('[Profile] Yüklenen oyun sayısı:', userStats.length);
      console.log('[Profile] Oyunlar:', userStats.map(s => s._id).join(', '));
      
      setProfileUser(userData);
      setStats((userStats || []).sort((a, b) => new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0)));
      setFriendshipStatus(userRes.friendshipStatus || 'none');
      
      const total = userStats.reduce((acc, curr) => acc + curr.totalTime, 0);
      setTotalTime(total);

      const userId = userData._id || userData.id;
      const [badgesRes, commsRes, accountsRes] = await Promise.all([
        api.getAllBadges(),
        userId ? api.getUserCommunities(userId) : Promise.resolve([]),
        isOwnProfile ? api.getConnectedAccounts() : Promise.resolve({})
      ]);
      console.log('User Communities:', commsRes);
      console.log('Connected Accounts:', accountsRes);
      setAllBadges(badgesRes || []);
      setCommunities(commsRes || []);
      setConnectedAccounts(accountsRes || {});
    } catch (err) {
      console.error('Profil yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (platformId, platformName) => {
    if (!window.confirm(`${platformName} hesabını kaldırmak istediğinize emin misiniz?`)) return;

    try {
      const updatedAccounts = await api.removeConnectedAccount(platformId);
      setConnectedAccounts(updatedAccounts);
      toast({ title: 'Başarılı', description: `${platformName} hesabı kaldırıldı` });
    } catch (err) {
      toast({ title: 'Hata', description: 'Hesap kaldırılamadı' });
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Refresh profile when page becomes visible (user returns from game)
    const handleVisibilityChange = () => {
      if (!document.hidden && isOwnProfile) {
        console.log('[Profile] Sayfa görünür oldu, profil yenileniyor...');
        fetchProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh every 30 seconds if it's own profile (to catch new games)
    let refreshInterval;
    if (isOwnProfile) {
      refreshInterval = setInterval(() => {
        console.log('[Profile] Otomatik yenileme...');
        fetchProfile();
      }, 30000); // 30 seconds
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">
            Profil Yükleniyor
          </p>
          <span className="sr-only">Profil bilgileri yükleniyor, lütfen bekleyin</span>
        </div>
      </div>
    );
  }

  if (!profileUser && !loading) {
     return (
        <div className="min-h-full flex items-center justify-center" role="alert">
           <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Kullanıcı bulunamadı</h2>
              <Link to="/" className="text-blue-500 hover:underline" aria-label="Ana sayfaya dön">
                Ana sayfaya dön
              </Link>
           </div>
        </div>
     )
  }

  return (
    <div className="relative min-h-full pb-12">
      {/* Optimized Background - Removed heavy blur/glow layers */}
      <div className="fixed inset-0 bg-background -z-10" aria-hidden="true" />
      
      <div className="container max-w-6xl mx-auto pt-16 px-4 relative z-10">
        
        {/* Profile Header - Optimized */}
        <div 
          className="relative rounded-3xl overflow-hidden border border-white/10 shadow-xl bg-black/40 mb-8 group"
          role="banner"
          aria-label="Profil başlığı"
        >
          {/* Header Banners - Removed Noise SVG */}
          <div className="h-48 w-full bg-gradient-to-r from-blue-900/40 to-purple-900/40 relative" aria-hidden="true">
            
            {/* Online Status Indicator */}
            <div 
              className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/10"
              role="status"
              aria-label="Kullanıcı çevrimiçi"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/90">Çevrimiçi</span>
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-6 relative">
              
              {/* Avatar */}
              <div 
                className="relative shrink-0 group"
                onClick={handleAvatarClick}
                role="button"
                tabIndex={isOwnProfile ? 0 : -1}
                aria-label={isOwnProfile ? "Profil fotoğrafını değiştir" : undefined}
                onKeyDown={(e) => {
                  if (isOwnProfile && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleAvatarClick();
                  }
                }}
              >
                <div className="w-32 h-32 rounded-2xl p-1 bg-black/50 border border-white/10 shadow-xl overflow-hidden">
                  {uploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 rounded-xl">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
                      <span className="sr-only">Profil fotoğrafı yükleniyor...</span>
                    </div>
                  ) : profileUser?.avatar ? (
                    <img 
                      src={profileUser.avatar} 
                      alt={`${profileUser.username} profil fotoğrafı`}
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                    />
                  ) : (
                    <img 
                      src="https://placehold.co/128x128/2a2a2a/FFF?text=Avatar" 
                      alt="Varsayılan profil fotoğrafı"
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                    />
                  )}
                </div>

                {isOwnProfile && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity m-1">
                    <Camera className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                )}

                {/* Level Badge */}
                <div 
                  className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 border-2 border-background shadow-lg flex items-center justify-center font-bold text-white text-sm"
                  role="status"
                  aria-label={`Seviye ${profileUser?.level || 1}`}
                >
                  {profileUser?.level || 1}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                  aria-label="Profil fotoğrafı dosyası seç"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl font-black text-foreground tracking-tight lowercase">
                    {profileUser?.globalName || profileUser?.username}
                  </h1>
                  {profileUser?.role === 'admin' && (
                    <div 
                      className="px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                      role="status"
                      aria-label="Yönetici"
                    >
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      ADMIN
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="lowercase" aria-label={`Kullanıcı adı: ${profileUser?.username}`}>
                    @{profileUser?.username}
                  </span>
                </div>
              </div>

                
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwnProfile ? (
                  <>
                    <Button 
                      onClick={() => setIsEditModalOpen(true)}
                      variant="outline" 
                      className="bg-white/5 border-white/10 hover:bg-white/10 gap-2"
                      aria-label="Profili düzenle"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      Düzenle
                    </Button>
                    
                    {/* Edit Profile Modal */}
                    {isEditModalOpen && (
                      <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-profile-modal-title"
                      >
                        <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            aria-label="Modalı kapat"
                          >
                            ✕
                          </button>
                          
                          <h2 id="edit-profile-modal-title" className="text-xl font-bold mb-1">Profili Düzenle</h2>
                          <p className="text-sm text-muted-foreground mb-6">Kullanıcı bilgilerinizi güncelleyin.</p>
                          
                          <div className="space-y-4">

                            <div className="space-y-2">
                              <label htmlFor="edit-username" className="text-sm font-medium text-gray-300">
                                Kullanıcı Adınız
                              </label>
                              <input 
                                id="edit-username"
                                type="text" 
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Yeni kullanıcı adı"
                                aria-required="true"
                              />
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="edit-globalname" className="text-sm font-medium text-gray-300">
                                Görünen Adınız
                              </label>
                              <input 
                                id="edit-globalname"
                                type="text" 
                                value={newGlobalName}
                                onChange={(e) => setNewGlobalName(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Yeni görünen adınız"
                              />
                            </div>

                            {editError && (
                              <div className="text-sm text-red-400" role="alert" aria-live="polite">
                                {editError}
                              </div>
                            )}
                            
                            <div className="flex justify-end gap-3 pt-2" role="group" aria-label="Modal işlem butonları">
                              <Button 
                                variant="ghost" 
                                onClick={() => setIsEditModalOpen(false)}
                                aria-label="İptal et ve modalı kapat"
                              >
                                İptal
                              </Button>
                              <Button 
                                onClick={handleUpdateProfile} 
                                disabled={updateLoading}
                                aria-label="Profil değişikliklerini kaydet"
                                aria-disabled={updateLoading}
                              >
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
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 h-11 px-6 rounded-xl transition-all cursor-default"
                        aria-label="Arkadaş olarak eklendi"
                        disabled
                      >
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        Arkadaş
                      </Button>
                    ) : friendshipStatus === 'pending' ? (
                      <Button 
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 h-11 px-6 rounded-xl transition-all cursor-default"
                        aria-label="Arkadaşlık isteği gönderildi, beklemede"
                        disabled
                      >
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        İstek Atıldı
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSendFriendRequest}
                        disabled={requestLoading}
                        className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 h-11 px-6 rounded-xl transition-all"
                        aria-label={`${profileUser?.username} kullanıcısına arkadaşlık isteği gönder`}
                        aria-disabled={requestLoading}
                      >
                        {requestLoading ? (
                          <>
                            <Rocket className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span className="sr-only">Gönderiliyor...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" aria-hidden="true" />
                            Arkadaş Ekle
                          </>
                        )}
                      </Button>
                    )}
                    <Link to={`/chat`}>
                      <Button 
                        variant="outline" 
                        className="bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6 rounded-xl"
                        aria-label={`${profileUser?.username} kullanıcısına mesaj gönder`}
                      >
                        <MessageSquare className="w-4 h-4" aria-hidden="true" />
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
                <Zap className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                Son Aktiviteler
              </h2>
              <span 
                className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-white/5"
                role="status"
                aria-label={`Son 2 haftada toplam ${formatTotalHours(totalTime)}`}
              >
                Son 2 haftada {formatTotalHours(totalTime)}
              </span>
            </div>

            <div className="space-y-4" role="list" aria-label="Oyun aktiviteleri">
              {stats.length > 0 ? (
                stats.map((stat, i) => (
                  <div 
                    key={stat._id} 
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d1117] p-5 transition-all duration-300 hover:bg-[#161b22]"
                    role="listitem"
                    aria-label={`${stat._id} oyunu, toplam ${formatTotalHours(stat.totalTime)}, son oynanma ${formatLastPlayed(stat.lastPlayed)}`}
                  >
                    <div className="flex items-center gap-6">
                      {/* Game Art */}
                      <div className="relative shrink-0 w-40 h-24 rounded-xl bg-[#0d1117] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/20 group-hover:shadow-primary/5">
                        {getGameImage(stat._id) ? (
                            <img 
                                src={getGameImage(stat._id)} 
                                alt={`${stat._id} oyun kapağı`}
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
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
                                aria-label={profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) 
                                  ? `${stat._id} oyununu görünür yap` 
                                  : `${stat._id} oyununu gizle`}
                              >
                                {profileUser?.settings?.privacy?.hiddenGames?.includes(stat._id) ? (
                                  <><Eye className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Görünür Yap</>
                                ) : (
                                  <><EyeOff className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Gizli Yap</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                    </div>
                  </div>
                ))
              ) : (
                <div 
                  className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/5"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-muted-foreground">Henüz oyun aktivitesi bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats Card */}
            <div 
              className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8"
              role="region"
              aria-labelledby="stats-heading"
            >
              <h3 id="stats-heading" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">
                İstatistikler
              </h3>
              <div className="grid grid-cols-2 gap-4" role="list" aria-label="Oyun istatistikleri">
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5" role="listitem">
                  <div className="text-4xl font-black text-white" aria-label={`${stats.length} oyun`}>
                    {stats.length}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">Oyun</div>
                </div>
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5" role="listitem">
                  <div className="text-4xl font-black text-white" aria-label={`Toplam ${formatTotalHours2(totalTime)}`}>
                    {formatTotalHours2(totalTime)}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">Toplam Süre</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div 
              className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8"
              role="region"
              aria-labelledby="badges-heading"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="badges-heading" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  Rozetler
                </h3>
                <span 
                  className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full"
                  role="status"
                  aria-label={`${profileUser?.badges?.length || 0} rozet kazanıldı`}
                >
                  {profileUser?.badges?.length || 0} Kazanıldı
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4" role="list" aria-label="Kazanılan rozetler">
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
                      role="listitem"
                      aria-label={`${badge.title} rozeti: ${badge.description}`}
                      tabIndex={0}
                    >
                      <Icon className="w-7 h-7 text-white drop-shadow-md" aria-hidden="true" />
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-[10px] w-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                        <div className="font-black text-white mb-1 uppercase tracking-widest">{badge.title}</div>
                        <div className="text-gray-400 font-medium leading-tight">{badge.description}</div>
                      </div>
                    </div>
                  );
                })}
                {(profileUser?.badges?.length || 0) === 0 && (
                  <div className="col-span-4 py-4 text-center" role="status" aria-live="polite">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Henüz rozet kazanılmadı</p>
                  </div>
                )}
              </div>
            </div>

            {/* Groups/Community */}
            <div 
              className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8"
              role="region"
              aria-labelledby="communities-heading"
            >
               <div className="flex items-center justify-between mb-6">
                 <h3 id="communities-heading" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                   Topluluklar
                 </h3>
                 <span 
                   className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full"
                   role="status"
                   aria-label={`${communities.length} topluluğa katılım`}
                 >
                   {communities.length} Katılım
                 </span>
               </div>
               
               <div className="space-y-4" role="list" aria-label="Katılınan topluluklar">
                 {communities.map((community) => (
                   <Link 
                     key={community._id} 
                     to={`/community/${community.slug}`} 
                     className="flex items-center gap-4 group cursor-pointer"
                     role="listitem"
                     aria-label={`${community.name} topluluğu, ${community.memberCount || 0} üye`}
                   >
                     <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0 overflow-hidden">
                       {community.avatar ? (
                         <img 
                           src={community.avatar} 
                           alt={`${community.name} logosu`}
                           className="w-full h-full object-cover" 
                         />
                       ) : (
                         <Users2 className="w-5 h-5" aria-hidden="true" />
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
                   <div className="text-center py-4" role="status" aria-live="polite">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Henüz bir topluluğa katılmadı</p>
                   </div>
                 )}
               </div>
            </div>

            {/* Connected Accounts */}
            {isOwnProfile && (
              <div 
                className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8"
                role="region"
                aria-labelledby="connected-accounts-heading"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 
                    id="connected-accounts-heading"
                    className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]"
                  >
                    Bağlı Hesaplar
                  </h3>
                  <Link to="/settings?tab=accounts">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-3 text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary"
                      aria-label="Bağlı hesapları düzenle"
                    >
                      Düzenle
                    </Button>
                  </Link>
                </div>
                
                <div className="space-y-3">
                  {(() => {
                    const platforms = [
                      { 
                        id: 'steam', 
                        name: 'Steam', 
                        color: 'from-blue-500 to-blue-600',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'discord', 
                        name: 'Discord', 
                        color: 'from-indigo-500 to-indigo-600',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.946-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'epic', 
                        name: 'Epic Games', 
                        color: 'from-gray-700 to-gray-800',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.894c-.447.447-1.062.671-1.789.671-.394 0-.841-.056-1.342-.168-.502-.112-1.006-.28-1.513-.504-.506-.224-1.006-.504-1.499-.84-.493-.336-.95-.728-1.37-1.176-.42.448-.877.84-1.37 1.176-.493.336-.993.616-1.499.84-.507.224-1.011.392-1.513.504-.501.112-.948.168-1.342.168-.727 0-1.342-.224-1.789-.671-.447-.447-.671-1.062-.671-1.789 0-.394.056-.841.168-1.342.112-.502.28-1.006.504-1.513.224-.506.504-1.006.84-1.499.336-.493.728-.95 1.176-1.37-.448-.42-.84-.877-1.176-1.37-.336-.493-.616-.993-.84-1.499-.224-.507-.392-1.011-.504-1.513C3.056 6.841 3 6.394 3 6c0-.727.224-1.342.671-1.789C4.118 3.764 4.733 3.54 5.46 3.54c.394 0 .841.056 1.342.168.502.112 1.006.28 1.513.504.506.224 1.006.504 1.499.84.493.336.95.728 1.37 1.176.42-.448.877-.84 1.37-1.176.493-.336.993-.616 1.499-.84.507-.224 1.011-.392 1.513-.504.501-.112.948-.168 1.342-.168.727 0 1.342.224 1.789.671.447.447.671 1.062.671 1.789 0 .394-.056.841-.168 1.342-.112.502-.28 1.006-.504 1.513-.224.506-.504 1.006-.84 1.499-.336.493-.728.95-1.176 1.37.448.42.84.877 1.176 1.37.336.493.616.993.84 1.499.224.507.392 1.011.504 1.513.112.501.168.948.168 1.342 0 .727-.224 1.342-.671 1.789z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'playstation', 
                        name: 'PlayStation', 
                        color: 'from-blue-600 to-blue-700',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.794.814.794 1.505v5.876c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.427-1.502zm4.656 16.242l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5v-2.042l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.029 5.437.661 1.848.601 2.041 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.84l.02-.002zM1.808 18.6c-1.9-.545-2.214-1.668-1.352-2.321.801-.585 2.159-1.051 2.159-1.051l5.616-2.013v2.155L4.181 16.83c-.718.258-.826.625-.246.818.586.192 1.637.139 2.357-.123l2.939-1.039v1.795c-.121.019-.241.041-.361.066-2.064.426-4.29.413-7.062-.747z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'xbox', 
                        name: 'Xbox', 
                        color: 'from-green-500 to-green-600',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912A11.942 11.942 0 0 0 24 12.004a11.95 11.95 0 0 0-3.57-8.536 12.607 12.607 0 0 0-2.06-1.632 12.729 12.729 0 0 0-3.108-1.26c.96 1.368 1.917 3.6 0 6.051zm-6.524 0C6.82 3.227 7.777.995 8.738-.373A12.729 12.729 0 0 0 5.63 1.887 12.607 12.607 0 0 0 3.57 3.519 11.95 11.95 0 0 0 0 12.055a11.942 11.942 0 0 0 2.662 7.535c-1.408-2.599 3.576-9.951 6.076-12.963z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'riot', 
                        name: 'Riot Games', 
                        color: 'from-red-500 to-red-600',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0L1.608 4.542v7.124c0 7.555 4.77 14.64 10.392 17.334 5.622-2.694 10.392-9.779 10.392-17.334V4.542L12 0zm-.896 17.347l-4.396-4.396 1.268-1.268 3.128 3.128 6.628-6.628 1.268 1.268-7.896 7.896z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'lol', 
                        name: 'League of Legends', 
                        color: 'from-yellow-500 to-yellow-600',
                        icon: (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818-5.423 0-9.818-4.395-9.818-9.818 0-5.423 4.395-9.818 9.818-9.818zM8.727 6.545L6.545 8.727l3.273 3.273-3.273 3.273 2.182 2.182L12 14.182l3.273 3.273 2.182-2.182L14.182 12l3.273-3.273-2.182-2.182L12 9.818 8.727 6.545z"/>
                          </svg>
                        )
                      }
                    ];

                    const connectedPlatforms = platforms.filter(p => 
                      connectedAccounts[p.id]?.username && connectedAccounts[p.id]?.verified
                    );

                    if (connectedPlatforms.length === 0) {
                      return (
                        <div className="text-center py-6" role="status" aria-live="polite">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic mb-3">
                            Henüz hesap bağlanmadı
                          </p>
                          <Link to="/settings?tab=accounts">
                            <Button 
                              size="sm" 
                              className="h-8 px-4 text-[9px] font-black uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                              aria-label="Yeni platform hesabı bağla"
                            >
                              Hesap Bağla
                            </Button>
                          </Link>
                        </div>
                      );
                    }

                    return connectedPlatforms.map((platform) => {
                      const account = connectedAccounts[platform.id];
                      const displayName = platform.id === 'discord' && account.discriminator 
                        ? `${account.username}#${account.discriminator}`
                        : account.username;
                      
                      return (
                        <div
                          key={platform.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-all duration-200 group relative"
                          role="article"
                          aria-label={`${platform.name} hesabı: ${displayName}`}
                        >
                          <div 
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-xl shrink-0`}
                            role="img"
                            aria-label={`${platform.name} logosu`}
                          >
                            {platform.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              {platform.name}
                            </div>
                            <div className="text-sm font-black text-white truncate">
                              {displayName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {account.profileUrl && (
                              <a
                                href={account.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${platform.name} profilini yeni sekmede aç`}
                              >
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                              </a>
                            )}
                            <button
                              onClick={() => handleRemoveAccount(platform.id, platform.name)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              aria-label={`${platform.name} hesabını kaldır`}
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}


