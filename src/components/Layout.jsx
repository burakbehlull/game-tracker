import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Moon, Sun, Home, User, LogOut, Gamepad2, Globe } from 'lucide-react';

export default function Layout({ children, user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold">
                <Gamepad2 className="h-6 w-6" />
                <span>Game Tracker</span>
              </Link>
              <div className="flex gap-4">
                <Link to="/">
                  <Button 
                    variant={location.pathname === '/' ? 'default' : 'ghost'}
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Keşfet
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button 
                    variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button 
                    variant={location.pathname === '/profile' ? 'default' : 'ghost'}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profil
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                <Moon className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.username}</span>
                <Button variant="ghost" size="icon" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className={location.pathname === '/profile' ? 'w-full' : 'container mx-auto px-4 py-8'}>
        {children}
      </main>
    </div>
  );
}

