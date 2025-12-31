import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Moon, Sun, User, LogOut, Gamepad2, Globe, BarChart3, Download } from 'lucide-react';

const DownloadURL = import.meta.env.VITE_DOWNLOAD_URL || null;

export default function Layout({ children, user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isWeb = !window.electronAPI;

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
                <Link to="/dashboard">
                  <Button 
                    variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
                    className="flex items-center gap-2 h-9 px-3"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden md:inline">Panel</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isWeb && (
                <Button 
                  onClick={() => window.open(DownloadURL, '_blank')}
                  className="hidden lg:flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-9 font-bold rounded-xl animate-pulse-subtle"
                >
                  <Download className="h-4 w-4" />
                  Uygulamayı İndir
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-2 bg-secondary/50 p-1 pr-1.5 rounded-full border border-white/5">
                <Link to={`/profile/${user?.username}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-white hidden md:inline">{user?.username}</span>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" 
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
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
