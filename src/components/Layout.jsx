import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Moon, Sun, User, LogOut, Gamepad2, Globe, BarChart3, Download, Clock, Settings, ChevronDown, Library, Users, MessageSquare } from 'lucide-react';

const DownloadURL = import.meta.env.VITE_DOWNLOAD_URL;

export default function Layout({ children, user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isWeb = !window.electronAPI;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowMenu(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6 overflow-hidden">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold shrink-0">
                <Gamepad2 className="h-6 w-6 text-primary" />
                <span className="hidden sm:inline">Game Tracker</span>
              </Link>
              <div className="flex gap-2">
                <Link to="/discover">
                  <Button 
                    variant={location.pathname === '/discover' ? 'default' : 'ghost'}
                    className="flex items-center gap-2 h-9 px-3"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden md:inline">Keşfet</span>
                  </Button>
                </Link>
                {user && (
                  <>
                    <Link to="/dashboard">
                      <Button 
                        variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-3"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden md:inline">Panel</span>
                      </Button>
                    </Link>
                    <Link to="/timer">
                      <Button 
                        variant={location.pathname === '/timer' ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-3"
                      >
                        <Clock className="h-4 w-4" />
                        <span className="hidden md:inline">Zamanlayıcı</span>
                      </Button>
                    </Link>
                    <Link to="/library">
                      <Button 
                        variant={location.pathname === '/library' ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-3"
                      >
                        <Library className="h-4 w-4" />
                        <span className="hidden md:inline">Kütüphane</span>
                      </Button>
                    </Link>
                    <Link to="/friends">
                      <Button
                        variant={location.pathname === '/friends' ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-3"
                      >
                        <Users className="h-4 w-4" />
                        <span className="hidden md:inline">Arkadaşlar</span>
                      </Button>
                    </Link>
                    <Link to="/chat">
                      <Button
                        variant={location.pathname.startsWith('/chat') ? 'default' : 'ghost'}
                        className="flex items-center gap-2 h-9 px-3"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden md:inline">Sohbet</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isWeb && (
                <a href={DownloadURL} target='_blank'>  
                  <Button 
                    className="hidden lg:flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-9 font-bold rounded-xl animate-pulse-subtle"
                  >
                    <Download className="h-4 w-4" />
                    Uygulamayı İndir
                  </Button>
                </a>
              )}
              {/*<div className="hidden sm:flex items-center gap-2 mr-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>*/}
              
              {user ? (
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
      <main className={location.pathname === '/' || location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'w-full' : 'container mx-auto px-4 py-8'}>
        {children}
      </main>
    </div>
  );
}
