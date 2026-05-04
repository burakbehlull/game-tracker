import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Users, Monitor, Bell, Check, X, AlertCircle, Shield, Lock, ChevronRight, 
  Eye, EyeOff, ShieldAlert, Fingerprint, Search, Moon, Sun, Camera, Trash2, Loader2, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/toaster';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage({ user: currentUser }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [user, setUser] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setUser(updatedUser);
        toast({ title: 'Başarılı', description: 'Profil yüklendi.' });
      } catch (err) {
        toast({ title: 'Hata', description: err.message || 'Yükleme başarısız oldu.' });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updatedUser = await api.updateProfile({ avatar: null });
      setUser(updatedUser);
      toast({ title: 'Başarılı', description: 'Profil fotoğrafı kaldırıldı.' });
    } catch (err) {
      toast({ title: 'Hata', description: err.message || 'İşlem başarısız oldu.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Form states
  const [editField, setEditField] = useState(null); 
  const [formData, setFormData] = useState({
    username: '',
    globalName: '',
    email: '',
    password: '',
    oldPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      if (currentUser?.settings?.theme === 'light' || currentUser?.settings?.theme === 'dark') {
        setTheme(currentUser.settings.theme);
      }
      setFormData({
        username: currentUser.username || '',
        globalName: currentUser.globalName || '',
        email: currentUser.email || '',
        password: '',
        oldPassword: ''
      });

      // Sync background settings from Electron if available
      if (window.electronAPI) {
        window.electronAPI.getBackgroundTracking().then(bgSettings => {
          if (bgSettings) {
            setUser(prev => ({
              ...prev,
              settings: {
                ...prev.settings,
                backgroundTracking: bgSettings
              }
            }));
          }
        });
      }
    }
  }, [currentUser, setTheme]);

  const handleUpdate = async (field) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const dataToUpdate = {};
      dataToUpdate[field] = formData[field];
      
      if (field === 'password') {
        dataToUpdate.oldPassword = formData.oldPassword;
      }
      
      const updatedUser = await api.updateProfile(dataToUpdate);
      setUser(updatedUser);
      setEditField(null);
      setSuccess(`${field === 'password' ? 'Şifre' : 'Bilgiler'} başarıyla güncellendi`);
      
      if (field === 'password') setFormData(prev => ({ ...prev, password: '', oldPassword: '' }));
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Güncelleme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDiscord = async (enabled) => {
    // Optimistic Update
    const previousUser = { ...user };
    setUser(prev => ({
      ...prev,
      settings: { ...prev.settings, discordRPCEnabled: enabled }
    }));

    try {
      const updatedUser = await api.updateProfile({ 
        settings: { discordRPCEnabled: enabled } 
      });
      
      setUser(updatedUser);
      
      if (window.electronAPI) {
        window.electronAPI.setDiscordRPC(enabled);
      }
    } catch (err) {
      console.error('Discord ayarı güncellenemedi:', err);
      setError('Ayar güncellenirken hata oluştu');
      // Rollback
      setUser(previousUser);
    }
  };

  const handleToggleHealth = async (enabled) => {
    // Optimistic Update
    const previousUser = { ...user };
    setUser(prev => ({
      ...prev,
      settings: { ...prev.settings, healthNotificationsEnabled: enabled }
    }));

    try {
      const updatedUser = await api.updateProfile({ 
        settings: { healthNotificationsEnabled: enabled } 
      });
      
      setUser(updatedUser);
      
      if (window.electronAPI) {
        window.electronAPI.setHealthNotifications(enabled);
      }
    } catch (err) {
      console.error('Sağlık bildirimi ayarı güncellenemedi:', err);
      setError('Ayar güncellenirken hata oluştu');
      // Rollback
      setUser(previousUser);
    }
  };

  const handleThemeToggle = async (enabled) => {
    const selectedTheme = enabled ? 'dark' : 'light';
    const previousTheme = theme;
    setTheme(selectedTheme);

    try {
      const updatedUser = await api.updateProfile({
        settings: {
          theme: selectedTheme
        }
      });
      setUser(updatedUser);
    } catch (err) {
      console.error('Tema ayarı güncellenemedi:', err);
      setError('Tema ayarı kaydedilemedi');
      setTheme(previousTheme);
    }
  };

  const handleToggleBackground = async (field, enabled) => {
    // Optimistic Update
    const previousUser = { ...user };
    const updatedBackgroundSettings = {
      ...(user?.settings?.backgroundTracking || { runInBackground: true, launchOnStartup: false }),
      [field]: enabled
    };

    setUser(prev => ({
      ...prev,
      settings: { 
        ...prev.settings, 
        backgroundTracking: updatedBackgroundSettings 
      }
    }));

    try {
      const updatedUser = await api.updateProfile({ 
        settings: { backgroundTracking: updatedBackgroundSettings } 
      });
      
      setUser(updatedUser);
      
      if (window.electronAPI) {
        window.electronAPI.setBackgroundTracking(updatedBackgroundSettings);
      }
    } catch (err) {
      console.error('Arka plan ayarı güncellenemedi:', err);
      setError('Ayar güncellenirken hata oluştu');
      setUser(previousUser);
    }
  };

  const handleTogglePassiveMatchmaking = async (enabled) => {
    // Optimistic Update
    const previousUser = { ...user };
    setUser(prev => ({
      ...prev,
      settings: { 
        ...prev.settings, 
        privacy: { 
          ...(prev.settings?.privacy || {}), 
          passiveMatchmakingEnabled: enabled 
        } 
      }
    }));

    try {
      const updatedUser = await api.updateProfile({ 
        settings: { 
          privacy: { 
            ...(user.settings?.privacy || {}), 
            passiveMatchmakingEnabled: enabled 
          } 
        } 
      });
      setUser(updatedUser);
    } catch (err) {
      console.error('Eşleştirme ayarı güncellenemedi:', err);
      setError('Ayar güncellenirken hata oluştu');
      setUser(previousUser);
    }
  };

  const menuItems = [
    { id: 'profile', icon: User, label: 'Kullanıcı Ayarları', sublabel: 'Profil ve Güvenlik' },
    { id: 'accounts', icon: Users, label: 'Bağlı Hesaplar', sublabel: 'Platform Entegrasyonları' },
    { id: 'app', icon: Monitor, label: 'Uygulama Ayarları', sublabel: 'Discord ve Bildirimler' },
    { id: 'privacy', icon: ShieldAlert, label: 'Gizlilik ve Veri', sublabel: 'Uygulama İzlemeyi Yönet' },
  ];

  const [supportedGames, setSupportedGames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Connected Accounts states
  const [connectedAccounts, setConnectedAccounts] = useState({});
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountDiscriminator, setAccountDiscriminator] = useState('');
  const [accountRegion, setAccountRegion] = useState('tr1');
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'privacy' && window.electronAPI) {
       window.electronAPI.getSupportedGames().then(setSupportedGames);
    }
    if (activeTab === 'accounts') {
      loadConnectedAccounts();
    }
  }, [activeTab]);

  const loadConnectedAccounts = async () => {
    try {
      const accounts = await api.getConnectedAccounts();
      setConnectedAccounts(accounts || {});
    } catch (err) {
      console.error('Bağlı hesaplar yüklenemedi:', err);
    }
  };

  const handleAddAccount = async () => {
    if (!selectedPlatform || !accountUsername.trim()) {
      toast({ title: 'Hata', description: 'Lütfen tüm alanları doldurun' });
      return;
    }

    setAccountLoading(true);
    try {
      const updatedAccounts = await api.addConnectedAccount(
        selectedPlatform.id,
        accountUsername.trim(),
        selectedPlatform.id === 'lol' ? accountRegion : null,
        selectedPlatform.id === 'discord' ? accountDiscriminator.trim() : null
      );
      setConnectedAccounts(updatedAccounts);
      setShowAddAccountModal(false);
      setSelectedPlatform(null);
      setAccountUsername('');
      setAccountDiscriminator('');
      setAccountRegion('tr1');
      toast({ title: 'Başarılı', description: `${selectedPlatform.name} hesabı bağlandı!` });
    } catch (err) {
      toast({ title: 'Hata', description: err?.data?.error || 'Hesap eklenemedi' });
    } finally {
      setAccountLoading(false);
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

  const handleToggleTracking = async (gameName) => {
    const isCurrentlyDisabled = user?.settings?.privacy?.disabledTrackingGames?.includes(gameName);
    const updatedDisabledList = isCurrentlyDisabled 
       ? user?.settings?.privacy?.disabledTrackingGames?.filter(g => g !== gameName)
       : [...(user?.settings?.privacy?.disabledTrackingGames || []), gameName];
    
    // Optimistic Update
    const previousUser = { ...user };
    setUser(prev => ({
       ...prev,
       settings: { 
         ...prev.settings, 
         privacy: { 
           ...(prev.settings?.privacy || {}), 
           disabledTrackingGames: updatedDisabledList 
         } 
       }
    }));

    try {
       const updatedUser = await api.updateProfile({ 
          settings: { 
             privacy: { 
                ...(user.settings?.privacy || {}), 
                disabledTrackingGames: updatedDisabledList 
             } 
          } 
       });
       setUser(updatedUser);
       if (window.electronAPI) {
          window.electronAPI.setUserSettings(updatedUser.settings);
       }
    } catch (err) {
       console.error('İzleme ayarı güncellenemedi:', err);
       setError('Ayar güncellenirken hata oluştu');
       setUser(previousUser);
    }
  };

  const filteredGames = supportedGames.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={cn('max-w-6xl mx-auto settings-page', isLight && 'settings-light')}>
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Menu */}
        <div className="w-full md:w-72 space-y-2">
          <div className="px-4 mb-4">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Ayarlar</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Sistem Tercihleri</p>
          </div>
          
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left group",
                  activeTab === item.id 
                    ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5" 
                    : "bg-[#0d1117] border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/[0.02]"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  activeTab === item.id ? "bg-primary text-white" : "bg-white/5 text-gray-500 group-hover:text-gray-300"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-tight">{item.label}</div>
                  <div className="text-[10px] opacity-60 font-medium">{item.sublabel}</div>
                </div>
                {activeTab === item.id && <ChevronRight className="ml-auto w-4 h-4" />}
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-6 rounded-[2rem] bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5">
             <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Destek</div>
             <p className="text-xs text-gray-400 font-medium leading-relaxed">Bir sorunla mı karşılaştın? Topluluğumuza katıl veya bize ulaş.</p>
             <Button variant="link" className="text-primary text-xs p-0 h-auto mt-3 font-bold uppercase tracking-widest">Yardım Merkezi</Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Profile Card Section */}
              <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20 relative">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                </div>
                <div className="px-8 pb-8">
                  <div className="flex flex-col md:flex-row items-start md:items-end -mt-10 gap-6 mb-8">
                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                      <div className="w-24 h-24 rounded-3xl p-1 bg-[#0d1117] border border-white/10 shadow-2xl overflow-hidden relative">
                          {uploadingAvatar ? (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                          ) : user?.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <User className="w-10 h-10 text-primary" />
                            </div>
                          )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity m-1">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*" 
                      />
                    </div>
                    <div className="pb-2 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter lowercase">{user?.globalName || user?.username}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-widest">Gamer</span>
                                <span className="text-xs text-gray-500 font-bold tracking-tight lowercase">@{user?.username}</span>
                            </div>
                          </div>
                          {user?.avatar && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleRemoveAvatar}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 gap-2 font-bold uppercase text-[10px] tracking-widest"
                            >
                              <Trash2 className="w-4 h-4" />
                              Fotoğrafı Kaldır
                            </Button>
                          )}
                        </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* Form Fields */}
                    {[
                      { id: 'globalName', label: 'Görünen Ad', value: user?.globalName || 'Ayarlanmamış' },
                      { id: 'username', label: 'Kullanıcı Adı', value: user?.username },
                      { id: 'email', label: 'E-posta Adresi', value: user?.email ? user.email.replace(/(.{2})(.*)(@.*)/, "$1********$3") : 'Eklenmemiş', isEmail: true },
                    ].map((field) => (
                      <div key={field.id} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                        <div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{field.label}</div>
                          {editField === field.id ? (
                            <Input 
                              value={formData[field.id]}
                              onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                              className="h-9 mt-2 bg-black/40 border-white/10 focus-visible:ring-primary w-full md:w-64"
                              autoFocus
                            />
                          ) : (
                            <div className="text-lg font-bold text-gray-200 tracking-tight">
                                {field.value}
                                {field.isEmail && user?.email && (
                                    <span className="text-[10px] text-primary ml-2 cursor-pointer hover:underline uppercase font-black" onClick={() => setEditField(field.id)}>Göster</span>
                                )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {editField === field.id ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setEditField(null)} className="text-gray-500"><X className="w-4 h-4"/></Button>
                              <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-lg px-6 font-bold" onClick={() => handleUpdate(field.id)} disabled={loading}>Kaydet</Button>
                            </>
                          ) : (
                            <Button variant="secondary" size="sm" className="bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 rounded-xl px-4 font-bold uppercase text-[10px] tracking-widest" onClick={() => setEditField(field.id)}>Düzenle</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Güvenlik ve Şifre</h3>
                </div>
                
                {editField === 'password' ? (
                  <div className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mevcut Şifre</Label>
                      <Input 
                        type="password"
                        value={formData.oldPassword}
                        onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
                        className="bg-black/40 border-white/10 focus-visible:ring-primary"
                        placeholder="Mevcut şifreniz"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Yeni Şifre</Label>
                      <Input 
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="bg-black/40 border-white/10 focus-visible:ring-primary"
                        placeholder="En az 6 karakter"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setEditField(null)}>İptal</Button>
                      <Button className="bg-primary hover:bg-primary/90 rounded-xl px-8 font-bold" onClick={() => handleUpdate('password')} disabled={loading}>Güncelle</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <p className="text-sm text-gray-500 font-medium">Hesap güvenliğini korumak için düzenli aralıklarla şifreni güncellemeni öneririz.</p>
                      <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white rounded-2xl px-6 font-bold uppercase text-[11px] tracking-widest" onClick={() => setEditField('password')}>Şifreyi Değiştir</Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold animate-in zoom-in-95 duration-200">
                  <Check className="w-5 h-5" />
                  {success}
                </div>
              )}
            </div>
          )}

          {activeTab === 'app' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <Monitor className="w-5 h-5" />
                    </div>
                    <h1 className="text-lg font-black text-white uppercase tracking-tight">Uygulama Tercihleri</h1>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="text-base font-black text-white tracking-tight">Tema Modu</div>
                        <p className="text-xs text-gray-500 font-medium">Açık ve koyu görünüm arasında geçiş yap.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <Switch
                        id="theme-mode"
                        checked={theme === 'dark'}
                        onCheckedChange={handleThemeToggle}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Moon className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="p-3 rounded-2xl bg-[#5865F2]/10 text-[#5865F2]">
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.946-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/></svg>
                        </div>
                        <div>
                          <div className="text-base font-black text-white tracking-tight">Discord Etkinlik Durumu</div>
                          <p className="text-xs text-gray-500 font-medium">Oynadığın oyunları Discord profilinde anlık olarak göster.</p>
                        </div>
                    </div>
                    <Switch 
                      id="discord-rpc"
                      checked={user?.settings?.discordRPCEnabled !== false} 
                      onCheckedChange={(checked) => handleToggleDiscord(checked)}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                             <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-base font-black text-white tracking-tight">Sağlık Sistemi Bildirimleri</div>
                          <p className="text-xs text-gray-500 font-medium">Uzun süreli oyun seansları için sağlık uyarıları al.</p>
                        </div>
                    </div>
                    <Switch 
                      id="health-notifications"
                      checked={user?.settings?.healthNotificationsEnabled !== false} 
                      onCheckedChange={(checked) => handleToggleHealth(checked)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  {window.electronAPI && (
                    <>
                      <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                 <Monitor className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-base font-black text-white tracking-tight">Arka Planda Çalıştır</div>
                              <p className="text-xs text-gray-500 font-medium">Pencere kapansa bile oyun takibi devam eder.</p>
                            </div>
                        </div>
                        <Switch 
                          id="run-in-background"
                          checked={user?.settings?.backgroundTracking?.runInBackground !== false} 
                          onCheckedChange={(checked) => handleToggleBackground('runInBackground', checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
                                 <Monitor className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-base font-black text-white tracking-tight">Başlangıçta Çalıştır</div>
                              <p className="text-xs text-gray-500 font-medium">Bilgisayar açıldığında uygulamayı otomatik başlat.</p>
                            </div>
                        </div>
                        <Switch 
                          id="launch-on-startup"
                          checked={user?.settings?.backgroundTracking?.launchOnStartup === true} 
                          onCheckedChange={(checked) => handleToggleBackground('launchOnStartup', checked)}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] opacity-50 cursor-not-allowed">
                    <div className="flex gap-4 items-center">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                             <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-base font-black text-white tracking-tight">Masaüstü Bildirimleri</div>
                          <p className="text-xs text-gray-500 font-medium">Süre limitleri ve başarımlar için bildirim al.</p>
                        </div>
                    </div>
                    <Switch disabled checked />
                  </div>
                </div>

                <div className="mt-12 p-8 rounded-[2rem] bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 flex items-center gap-6">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                      <Monitor className="w-8 h-8 text-blue-500/50" />
                   </div>
                   <div className="flex-1">
                      <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 italic">Yolda Olanlar</div>
                      <p className="text-sm text-gray-400 font-bold tracking-tight">Daha fazla tema ve görünüm seçeneği yakında burada olacak!</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <h1 className="text-lg font-black text-white uppercase tracking-tight">Bağlı Hesaplar</h1>
                  </div>
                  <Button 
                    onClick={() => setShowAddAccountModal(true)}
                    className="bg-primary hover:bg-primary/90 gap-2 font-black uppercase text-[10px] tracking-widest rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Hesap Ekle
                  </Button>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const platforms = [
                      { 
                        id: 'steam', 
                        name: 'Steam', 
                        color: 'from-blue-500 to-blue-600', 
                        desc: 'Steam Community profili',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'discord', 
                        name: 'Discord', 
                        color: 'from-indigo-500 to-indigo-600', 
                        desc: 'Discord kullanıcı adı',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.946-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'epic', 
                        name: 'Epic Games', 
                        color: 'from-gray-700 to-gray-800', 
                        desc: 'Epic Games hesabı',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.894c-.447.447-1.062.671-1.789.671-.394 0-.841-.056-1.342-.168-.502-.112-1.006-.28-1.513-.504-.506-.224-1.006-.504-1.499-.84-.493-.336-.95-.728-1.37-1.176-.42.448-.877.84-1.37 1.176-.493.336-.993.616-1.499.84-.507.224-1.011.392-1.513.504-.501.112-.948.168-1.342.168-.727 0-1.342-.224-1.789-.671-.447-.447-.671-1.062-.671-1.789 0-.394.056-.841.168-1.342.112-.502.28-1.006.504-1.513.224-.506.504-1.006.84-1.499.336-.493.728-.95 1.176-1.37-.448-.42-.84-.877-1.176-1.37-.336-.493-.616-.993-.84-1.499-.224-.507-.392-1.011-.504-1.513C3.056 6.841 3 6.394 3 6c0-.727.224-1.342.671-1.789C4.118 3.764 4.733 3.54 5.46 3.54c.394 0 .841.056 1.342.168.502.112 1.006.28 1.513.504.506.224 1.006.504 1.499.84.493.336.95.728 1.37 1.176.42-.448.877-.84 1.37-1.176.493-.336.993-.616 1.499-.84.507-.224 1.011-.392 1.513-.504.501-.112.948-.168 1.342-.168.727 0 1.342.224 1.789.671.447.447.671 1.062.671 1.789 0 .394-.056.841-.168 1.342-.112.502-.28 1.006-.504 1.513-.224.506-.504 1.006-.84 1.499-.336.493-.728.95-1.176 1.37.448.42.84.877 1.176 1.37.336.493.616.993.84 1.499.224.507.392 1.011.504 1.513.112.501.168.948.168 1.342 0 .727-.224 1.342-.671 1.789z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'playstation', 
                        name: 'PlayStation Network', 
                        color: 'from-blue-600 to-blue-700', 
                        desc: 'PSN profili',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.794.814.794 1.505v5.876c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.427-1.502zm4.656 16.242l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5v-2.042l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.029 5.437.661 1.848.601 2.041 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.84l.02-.002zM1.808 18.6c-1.9-.545-2.214-1.668-1.352-2.321.801-.585 2.159-1.051 2.159-1.051l5.616-2.013v2.155L4.181 16.83c-.718.258-.826.625-.246.818.586.192 1.637.139 2.357-.123l2.939-1.039v1.795c-.121.019-.241.041-.361.066-2.064.426-4.29.413-7.062-.747z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'xbox', 
                        name: 'Xbox Live', 
                        color: 'from-green-500 to-green-600', 
                        desc: 'Xbox Gamertag',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912A11.942 11.942 0 0 0 24 12.004a11.95 11.95 0 0 0-3.57-8.536 12.607 12.607 0 0 0-2.06-1.632 12.729 12.729 0 0 0-3.108-1.26c.96 1.368 1.917 3.6 0 6.051zm-6.524 0C6.82 3.227 7.777.995 8.738-.373A12.729 12.729 0 0 0 5.63 1.887 12.607 12.607 0 0 0 3.57 3.519 11.95 11.95 0 0 0 0 12.055a11.942 11.942 0 0 0 2.662 7.535c-1.408-2.599 3.576-9.951 6.076-12.963z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'riot', 
                        name: 'Riot Games', 
                        color: 'from-red-500 to-red-600', 
                        desc: 'Riot hesabı',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0L1.608 4.542v7.124c0 7.555 4.77 14.64 10.392 17.334 5.622-2.694 10.392-9.779 10.392-17.334V4.542L12 0zm-.896 17.347l-4.396-4.396 1.268-1.268 3.128 3.128 6.628-6.628 1.268 1.268-7.896 7.896z"/>
                          </svg>
                        )
                      },
                      { 
                        id: 'lol', 
                        name: 'League of Legends', 
                        color: 'from-yellow-500 to-yellow-600', 
                        desc: 'LoL Summoner adı',
                        icon: (
                          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818-5.423 0-9.818-4.395-9.818-9.818 0-5.423 4.395-9.818 9.818-9.818zM8.727 6.545L6.545 8.727l3.273 3.273-3.273 3.273 2.182 2.182L12 14.182l3.273 3.273 2.182-2.182L14.182 12l3.273-3.273-2.182-2.182L12 9.818 8.727 6.545z"/>
                          </svg>
                        )
                      }
                    ];

                    return platforms.map((platform) => {
                      const account = connectedAccounts[platform.id];
                      const isConnected = account?.username && account?.verified;

                      return (
                        <div key={platform.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl shrink-0`}>
                              {platform.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-black text-white tracking-tight">{platform.name}</div>
                              <div className="text-xs text-muted-foreground font-medium">{platform.desc}</div>
                              {isConnected && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-sm font-bold text-white">{account.username}</span>
                                  {account.profileUrl && (
                                    <a 
                                      href={account.profileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:text-primary/80 transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            {isConnected ? (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAccount(platform.id, platform.name)}
                                className="border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold uppercase text-[10px] tracking-widest rounded-xl"
                              >
                                Kaldır
                              </Button>
                            ) : (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlatform(platform);
                                  setShowAddAccountModal(true);
                                }}
                                className="border-primary/20 text-primary hover:bg-primary/10 font-bold uppercase text-[10px] tracking-widest rounded-xl"
                              >
                                Bağla
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Add Account Modal */}
          {showAddAccountModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[2rem] shadow-3xl animate-in zoom-in duration-300 overflow-hidden">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                      {selectedPlatform ? `${selectedPlatform.name} Bağla` : 'Hesap Ekle'}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setShowAddAccountModal(false);
                        setSelectedPlatform(null);
                        setAccountUsername('');
                      }}
                      className="rounded-full hover:bg-white/5"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  {selectedPlatform && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selectedPlatform.color} flex items-center justify-center text-xl`}>
                          {selectedPlatform.icon}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{selectedPlatform.name}</div>
                          <div className="text-xs text-muted-foreground">{selectedPlatform.desc}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kullanıcı Adı</Label>
                        <Input 
                          value={accountUsername}
                          onChange={(e) => setAccountUsername(e.target.value)}
                          placeholder={selectedPlatform.id === 'discord' ? 'Discord kullanıcı adın' : `${selectedPlatform.name} kullanıcı adın`}
                          className="h-12 bg-white/5 border-white/10 rounded-xl font-medium"
                          autoFocus
                        />
                      </div>

                      {selectedPlatform.id === 'discord' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discriminator (Opsiyonel)</Label>
                          <Input 
                            value={accountDiscriminator}
                            onChange={(e) => setAccountDiscriminator(e.target.value)}
                            placeholder="1234"
                            maxLength={4}
                            className="h-12 bg-white/5 border-white/10 rounded-xl font-medium"
                          />
                          <p className="text-xs text-muted-foreground">Örnek: username#1234 için sadece "1234" yazın</p>
                        </div>
                      )}

                      {selectedPlatform.id === 'lol' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bölge</Label>
                          <select 
                            value={accountRegion}
                            onChange={(e) => setAccountRegion(e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-medium text-white focus:outline-none focus:border-primary/50"
                          >
                            <option value="tr1">TR - Türkiye</option>
                            <option value="euw1">EUW - Batı Avrupa</option>
                            <option value="eune1">EUNE - Kuzey ve Doğu Avrupa</option>
                            <option value="na1">NA - Kuzey Amerika</option>
                            <option value="br1">BR - Brezilya</option>
                            <option value="la1">LAN - Latin Amerika Kuzey</option>
                            <option value="la2">LAS - Latin Amerika Güney</option>
                            <option value="kr">KR - Kore</option>
                            <option value="jp1">JP - Japonya</option>
                            <option value="oc1">OCE - Okyanusya</option>
                            <option value="ru">RU - Rusya</option>
                          </select>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddAccountModal(false);
                            setSelectedPlatform(null);
                            setAccountUsername('');
                            setAccountDiscriminator('');
                          }}
                          className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest"
                        >
                          İptal
                        </Button>
                        <Button 
                          onClick={handleAddAccount}
                          disabled={accountLoading || !accountUsername.trim()}
                          className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest"
                        >
                          {accountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bağla'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                              <ShieldAlert className="w-5 h-5" />
                          </div>
                          <h1 className="text-lg font-black text-white uppercase tracking-tight">Gizlilik Dashboard</h1>
                      </div>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                             placeholder="Oyun ara..." 
                             className="pl-10 h-10 w-full md:w-64 bg-black/40 border-white/10 rounded-xl text-sm focus-visible:ring-purple-500"
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {/* Passive Matchmaking Switch */}
                      <div className="col-span-full mb-4 flex items-center justify-between p-6 bg-primary/5 border border-primary/20 rounded-[2rem] hover:border-primary/30 transition-colors">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                 <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-base font-black text-white tracking-tight">Pasif Eşleştirme</div>
                              <p className="text-xs text-gray-500 font-medium">Kapalı olursa eşleştirme listelerinde görünmezsin.</p>
                            </div>
                        </div>
                        <Switch 
                          id="passive-matchmaking"
                          checked={user?.settings?.privacy?.passiveMatchmakingEnabled !== false} 
                          onCheckedChange={(checked) => handleTogglePassiveMatchmaking(checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>

                      {filteredGames.length > 0 ? (
                        filteredGames.map((game) => {
                          const isDisabled = user?.settings?.privacy?.disabledTrackingGames?.includes(game);
                          return (
                            <div key={game} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                   <div className={cn("p-2 rounded-xl transition-colors", isDisabled ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                                      {isDisabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                   </div>
                                   <div>
                                      <div className="text-sm font-bold text-gray-200">{game}</div>
                                      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{isDisabled ? 'İzleme Kapalı' : 'İzleniyor'}</div>
                                   </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleToggleTracking(game)}
                                  className={cn("text-[10px] font-black uppercase tracking-widest px-3", isDisabled ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-red-500 hover:text-red-400 hover:bg-red-500/10")}
                                >
                                   {isDisabled ? 'İzlemeyi Aç' : 'İzlemeyi Kapat'}
                                </Button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">Oyun bulunamadı</div>
                      )}
                  </div>
               </div>

               <div className="rounded-[2rem] border border-white/5 bg-[#0d1117] overflow-hidden">
                  <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                      <div className="flex items-center gap-3 mb-2">
                         <Fingerprint className="w-5 h-5 text-primary" />
                         <h3 className="text-sm font-black text-white uppercase tracking-widest">Gizlilik Taahhüdü</h3>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium">Bu uygulama sadece yukarıda listelenen oyunların yürütülebilir dosyalarını (.exe) işlem listesinden kontrol eder. Tarayıcı geçmişinize, şahsi dosyalarınıza veya parolanıza kesinlikle erişmez. Tüm veri toplama işlemleri sizin kontrolünüzdedir.</p>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3">Neler İzleniyor?</div>
                          <ul className="space-y-3">
                              {['Çalışan Oyunun Adı', 'Oyun Süresi', 'Başlatılma Saati'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-xs text-gray-400 font-bold tracking-tight">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                   {item}
                                </li>
                              ))}
                          </ul>
                      </div>
                      <div>
                          <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-3">Neler İzlenmiyor?</div>
                          <ul className="space-y-3">
                              {['Gözatma Geçmişi', 'Şahsi Belgeler', 'Ekran Görüntüsü'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-xs text-gray-400 font-bold tracking-tight">
                                   <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                   {item}
                                </li>
                              ))}
                          </ul>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
