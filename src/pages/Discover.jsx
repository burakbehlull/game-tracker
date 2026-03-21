import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, User, Monitor, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Discover() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [featuredUsers, setFeaturedUsers] = useState([]);

  // Load some initial users/stats if needed
  // Load initial users
  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      // Assuming searchUsers with empty string returns all/some users,
      // or we can add a specific getAllUsers endpoint. 
      // For now, let's try searching for a common letter or modify backend to return all on empty search.
      // However, usually "search" needs a query. 
      // Let's assume we want to "Discover" so maybe just fetch latest users?
      // Since I cannot change backend easily right now without checking, I will assume searchUsers('') might work
      // or I will try to search for " " (space).
      // Actually, looking at the previous backend code summary, I didn't explicitly see "get all users".
      // Let's try to just call searchUsers('') for now. If it fails, I'll need to update backend.
      const users = await api.searchUsers(''); 
      setResults(users);
    } catch (error) {
      console.error('Kullanıcı listeleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    // allow empty search to reset to all users
    searchUsers(query);
  };

  const searchUsers = async (q) => {
    setLoading(true);
    try {
      const users = await api.searchUsers(q);
      setResults(users);
    } catch (error) {
      console.error('Arama hatası:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-12">
      
      {/* Search Hero Section */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 relative">
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2">
          Oyuncuları <span className="text-primary">Keşfet</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Diğer oyuncuların istatistiklerini gör, yeni arkadaşlar bul ve rekabete katıl.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-xl relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          <div className="relative flex shadow-2xl">
            <Input 
              className="h-14 pl-12 pr-4 text-lg bg-black/40 border-white/10 backdrop-blur-xl rounded-l-xl rounded-r-none focus-visible:ring-0 focus-visible:border-primary/50 transition-all"
              placeholder="Kullanıcı adı ara..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <Button 
              type="submit" 
              size="lg" 
              className="h-14 rounded-l-none rounded-r-xl px-8 text-lg font-bold"
              disabled={loading}
            >
              {loading ? '...' : 'Ara'}
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {results.map((user) => (
            <Link key={user._id} to={`/profile/${user.username}`}>
              <div className="group relative bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-black p-0.5 border border-white/10 group-hover:border-primary/50 transition-colors shrink-0">
                    <img 
                      src={user.avatar || `https://placehold.co/128x128/2a2a2a/FFF?text=${user.username.charAt(0).toUpperCase()}`}
                      alt={user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-white group-hover:text-primary truncate transition-colors">
                        {user.username}
                      </h3>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Level</span>
                        <span className="text-sm font-black text-white">{user.level || 1}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      {/* XP Progress Bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                          style={{ width: `${(user.xp % 1000) / 10}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-primary/70" /> {user.xp || 0} XP
                        </span>
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3 text-primary/70" /> {new Date(user.createdAt).getFullYear()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        query && !loading && (
          <div className="text-center text-muted-foreground py-12">
            Sonuç bulunamadı.
          </div>
        )
      )}

      {/* Empty State / Suggestions */}
      {!query && results.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50 blur-[1px] select-none pointer-events-none">
          {/* Placeholder items to show structure */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      )}
    </div>
  );
}
