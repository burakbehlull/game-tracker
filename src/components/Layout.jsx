import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { User, LogOut, Gamepad2, Globe, BarChart3, Download, Clock, 
  Settings, ChevronDown, Library, Users, MessageSquare, Users2, Bell, Check, Trash2, Shield, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

const DownloadURL = import.meta.env.VITE_DOWNLOAD_URL;

export default function Layout({ children, user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isWeb = !window.electronAPI;
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const { events } = useWebSocket();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (events.notificationNew) {
      setNotifications(prev => [events.notificationNew, ...prev]);
      
      // Show toast if it's a message
      if (events.notificationNew.type === 'NEW_MESSAGE') {
        setActiveToast(events.notificationNew);
        setTimeout(() => setActiveToast(null), 5000);
      }
    }
  }, [events.notificationNew]);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowMenu(false);
    onLogout();
  };

  const navLinks = [
    
    { to: '/discover', icon: Globe, label: 'Keşfet' },
    { to: '/dashboard', icon: BarChart3, label: 'Panel', protected: true },
    { to: '/timer', icon: Clock, label: 'Zamanlayıcı', protected: true },
    { to: '/library', icon: Library, label: 'Kütüphane', protected: true },
    { to: '/friends', icon: Users, label: 'Arkadaşlar', protected: true },
    { to: '/community', icon: Users2, label: 'Topluluk', protected: true },
    { to: '/chat', icon: MessageSquare, label: 'Sohbet', protected: true },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background h-screen overflow-hidden">
      <nav className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold shrink-0">
                <Gamepad2 className="h-6 w-6 text-primary" />
                <span className="hidden sm:inline">Game Tracker</span>
              </Link>
              <div className="hidden sm:flex gap-1 md:gap-2">
                {navLinks.map((link) => {
                  if (link.protected && !user) return null;
                  const isActive = location.pathname === link.to || (link.to === '/chat' && location.pathname.startsWith('/chat'));
                  return (
                    <Link key={link.to} to={link.to}>
                      <Button 
                        variant={isActive ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-2 md:px-3"
                      >
                        <link.icon className="h-4 w-4" />
                        <span className="hidden xl:inline">{link.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isWeb && (
                <a href={DownloadURL} target='_blank'>  
                  <Button 
                    className="hidden lg:flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-9 font-bold rounded-xl animate-pulse-subtle"
                  >
                    <Download className="h-4 w-4" />
                    İndir
                  </Button>
                </a>
              )}
              
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Notifications */}
                  <div className="relative" ref={notifRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2 rounded-full hover:bg-secondary/80 transition-colors relative"
                    >
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-card" />
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-[#0d1117] border border-white/5 rounded-[1.5rem] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bildirimler</span>
                          {notifications.some(n => !n.read) && (
                            <button 
                              onClick={handleMarkAllRead}
                              className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                              Tümünü Oku
                            </button>
                          )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">Bildirim yok</div>
                          ) : (
                            <>
                              {notifications.map(n => (
                                <div 
                                  key={n._id} 
                                  onClick={() => handleMarkRead(n._id)}
                                  className={cn(
                                    "px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5",
                                    !n.read && "bg-primary/5"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                      !n.read ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                                    )}>
                                      <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-white line-clamp-2">
                                        {n.type === 'DISCUSSION_APPROVED' && `Tartışman "${n.data.title}" onaylandı!`}
                                        {n.type === 'MEMBER_ACCEPTED' && `"${n.data.communityName}" topluluğuna kabul edildin!`}
                                        {n.type === 'NEW_POST' && `"${n.data.communityName}" topluluğunda yeni bir konu: ${n.data.title}`}
                                        {n.type === 'MEMBER_REQUEST' && `"${n.data.communityName}" topluluğuna yeni üyelik isteği var.`}
                                        {n.type === 'ROLE_UPDATED' && `"${n.data.communityName}" topluluğunda rolün ${n.data.role} olarak güncellendi.`}
                                        {n.type === 'NEW_MESSAGE' && `${n.data.senderName} size mesaj attı: ${n.data.messagePreview}`}
                                      </p>
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 block">
                                        {new Date(n.createdAt).toLocaleDateString('tr-TR')}
                                      </span>
                                    </div>
                                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                                  </div>
                                </div>
                              ))}
                              <Link 
                                to="/notifications" 
                                className="block w-full px-4 py-3 text-center text-[10px] font-black text-primary uppercase tracking-widest hover:bg-white/5 transition-colors"
                                onClick={() => setShowNotifications(false)}
                              >
                                Tüm Bildirimleri Gör
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary/80 p-1 pr-3 rounded-full border border-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-white hidden md:inline">{user?.username}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-60 bg-[#0d1117] border border-white/5 rounded-[1.5rem] shadow-2xl z-50 py-3 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                        <div className="px-4 py-2 border-b border-white/5 mb-2">
                          <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Kullanıcı Hesabı</div>
                          <div className="text-sm font-bold text-white truncate lowercase">{user?.globalName || user?.username}</div>
                        </div>
                        
                        <Link 
                          to={`/profile/${user?.username}`} 
                          className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                          onClick={() => setShowMenu(false)}
                        >
                          <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          Profilim
                        </Link>
                        
                        <Link 
                          to="/settings" 
                          className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                          onClick={() => setShowMenu(false)}
                        >
                          <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                            <Settings className="w-3.5 h-3.5" />
                          </div>
                          Ayarlar
                        </Link>

                        {user?.roles?.includes('admin') && (
                          <Link 
                            to="/admin" 
                            className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-red-500/70 uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group"
                            onClick={() => setShowMenu(false)}
                          >
                            <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                              <Shield className="w-3.5 h-3.5" />
                            </div>
                            Admin Paneli
                          </Link>
                        )}

                        <div className="h-[1px] bg-white/5 my-2 mx-4" />
                        
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-red-500/70 uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group"
                        >
                          <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <LogOut className="w-3.5 h-3.5" />
                          </div>
                          Çıkış Yap
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" className="h-9 font-bold">Giriş Yap</Button>
                  </Link>
                  <Link to="/register">
                    <Button className="h-9 font-bold rounded-xl">Katıl</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">
        <main className={cn(
          "flex-1 overflow-y-auto",
          (location.pathname === '/' || location.pathname === '/profile' || location.pathname.startsWith('/profile/')) ? 'w-full' : 'container mx-auto px-4 py-8'
        )}>
          {children}
        </main>
      </div>

      {/* Bottom Nav for Mobile */}
      <div className="sm:hidden border-t bg-card h-16 shrink-0 flex items-center justify-around px-2 pb-safe">
        {navLinks.map((link) => {
          if (link.protected && !user) return null;
          const isActive = location.pathname === link.to || (link.to === '/chat' && location.pathname.startsWith('/chat'));
          return (
            <Link key={link.to} to={link.to} className="flex flex-col items-center gap-1 group">
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                isActive ? "bg-primary text-white" : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
              )}>
                <link.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-20 right-4 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className="bg-[#0d1117] border border-primary/20 rounded-[1.5rem] p-4 shadow-2xl shadow-primary/20 backdrop-blur-xl min-w-[300px] flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Yeni Mesaj</span>
                <button onClick={() => setActiveToast(null)} className="text-muted-foreground hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-bold text-white mb-0.5">{activeToast.data.senderName}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{activeToast.data.messagePreview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
