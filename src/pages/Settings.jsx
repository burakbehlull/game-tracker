import { useState, useEffect } from 'react';
import { User, Monitor, Bell, Check, X, AlertCircle, Shield, Lock, ChevronRight, Eye, EyeOff, ShieldAlert, Fingerprint, Search, Moon, Sun } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage({ user: currentUser }) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [editField, setEditField] = useState(null); 
  const [formData, setFormData] = useState({
    username: '',
    globalName: '',
    email: '',
    password: ''
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
        password: ''
      });
    }
  }, [currentUser, setTheme]);

  const handleUpdate = async (field) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const dataToUpdate = {};
      dataToUpdate[field] = formData[field];
      
      const updatedUser = await api.updateProfile(dataToUpdate);
      setUser(updatedUser);
      setEditField(null);
      setSuccess(`${field === 'password' ? 'Şifre' : 'Bilgiler'} başarıyla güncellendi`);
      
      if (field === 'password') setFormData(prev => ({ ...prev, password: '' }));
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

  const menuItems = [
    { id: 'profile', icon: User, label: 'Kullanıcı Ayarları', sublabel: 'Profil ve Güvenlik' },
    { id: 'app', icon: Monitor, label: 'Uygulama Ayarları', sublabel: 'Discord ve Bildirimler' },
    { id: 'privacy', icon: ShieldAlert, label: 'Gizlilik ve Veri', sublabel: 'Uygulama İzlemeyi Yönet' },
  ];

  const [supportedGames, setSupportedGames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'privacy' && window.electronAPI) {
       window.electronAPI.getSupportedGames().then(setSupportedGames);
    }
  }, [activeTab]);

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
                    <div className="w-24 h-24 rounded-3xl p-1 bg-[#0d1117] border border-white/10 shadow-2xl">
                        <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <User className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <div className="pb-2">
                        <h2 className="text-3xl font-black text-white tracking-tighter lowercase">{user?.globalName || user?.username}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-widest">Gamer</span>
                            <span className="text-xs text-gray-500 font-bold tracking-tight lowercase">@{user?.username}</span>
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
