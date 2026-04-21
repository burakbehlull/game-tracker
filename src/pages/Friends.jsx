import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Link } from 'react-router-dom';
import { Users, Search, MessageSquare, UserMinus, Check, X, Clock, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

// --- YARDIMCI FONKSİYONLAR ---
function getAvatarColor(username = '') {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// --- ALT BİLEŞENLER ---

const FriendItem = memo(({ friend, presence, onRemove }) => {
  const p = presence[String(friend._id)];
  const isOnline = p?.isOnline;
  const isPlaying = p?.isPlaying;

  return (
    <div className="group flex items-center justify-between bg-secondary/10 hover:bg-secondary/20 border border-white/5 rounded-[1.5rem] p-4 transition-all duration-300">
      <div className="flex items-center gap-4 min-w-0">
        <Link to={`/profile/${friend.username}`} className="relative shrink-0">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg", getAvatarColor(friend.username))}>
            {friend.username[0].toUpperCase()}
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0d1117]",
            isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-500"
          )} />
        </Link>
        <div className="min-w-0">
          <Link to={`/profile/${friend.username}`}>
            <h3 className="font-bold text-white text-base truncate group-hover:text-primary transition-colors">{friend.username}</h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isOnline ? "text-primary" : "text-muted-foreground opacity-60"
            )}>
              {isOnline ? (isPlaying ? "OYNUYOR" : "ÇEVRİMİÇİ") : "ÇEVRİMDIŞI"}
            </span>
            {isPlaying && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/70 truncate italic">
                  {p.currentGame}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/chat">
          <Button size="icon" variant="ghost" className="rounded-xl hover:bg-primary/20 hover:text-primary text-muted-foreground transition-all">
            <MessageSquare className="w-5 h-5" />
          </Button>
        </Link>
        <Button size="icon" variant="ghost" className="rounded-xl hover:bg-red-500/20 hover:text-red-500 text-muted-foreground transition-all" onClick={() => onRemove(friend._id)}>
          <UserMinus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
});

const RequestItem = memo(({ request, onAccept, onReject }) => (
  <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-[1.5rem] p-4">
    <div className="flex items-center gap-4">
      <Link to={`/profile/${request.fromUserId?.username}`}>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md hover:opacity-80 transition-opacity", getAvatarColor(request.fromUserId?.username))}>
          {request.fromUserId?.username?.[0].toUpperCase()}
        </div>
      </Link>
      <div>
        <Link to={`/profile/${request.fromUserId?.username}`}>
          <div className="font-bold text-white text-sm hover:text-primary transition-colors">{request.fromUserId?.username}</div>
        </Link>
        <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Arkadaşlık İsteği</div>
      </div>
    </div>
    <div className="flex gap-2">
      <Button size="icon" className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" onClick={() => onAccept(request._id)}>
        <Check className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="ghost" className="w-9 h-9 rounded-xl hover:bg-red-500/20 hover:text-red-500 text-muted-foreground" onClick={() => onReject(request._id)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
));

export default function Friends() {
  const { events, connected } = useWebSocket();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [presence, setPresence] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData, presenceData] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
        api.getFriendsPresence()
      ]);
      setFriends(friendsData || []);
      setRequests(requestsData || { incoming: [], outgoing: [] });
      const map = {};
      (presenceData || []).forEach((item) => {
        map[item.userId] = item;
      });
      setPresence(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (events.friendRequest || events.friendResolved || events.friendRemoved) loadAll();
  }, [events.friendRequest, events.friendResolved, events.friendRemoved, loadAll]);

  useEffect(() => {
    if (!events.presence?.userId) return;
    setPresence((prev) => ({ ...prev, [events.presence.userId]: events.presence }));
  }, [events.presence]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const users = await api.searchUsers(query);
      setSearchResults(users || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (username) => {
    await api.sendFriendRequest({ username });
    await loadAll();
  };

  const outgoingIds = useMemo(
    () => new Set((requests.outgoing || []).map((r) => String(r.toUserId?._id || r.toUserId))),
    [requests.outgoing]
  );

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
            ARKADAŞLAR
          </h1>
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
              {connected ? 'SUNUCUYA BAĞLI' : 'BAĞLANTI KESİLDİ'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <Card className="p-8 bg-card/50 backdrop-blur-xl border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Search className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Yeni Bağlantılar Kur</span>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Input 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="Kullanıcı adı ile ara..." 
                className="h-14 pl-12 bg-secondary/20 border-white/5 rounded-2xl font-medium italic focus-visible:ring-primary/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
            <Button onClick={handleSearch} size="lg" className="h-14 px-8 rounded-2xl font-black italic tracking-tighter bg-primary hover:bg-primary/80 text-white shadow-xl shadow-primary/20 transition-all">
              ARA
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
              {searchResults.map((user) => (
                <div key={user._id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 p-4 group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/profile/${user.username}`}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shrink-0 hover:opacity-80 transition-opacity", getAvatarColor(user.username))}>
                        {user.username[0].toUpperCase()}
                      </div>
                    </Link>
                    <Link to={`/profile/${user.username}`}>
                      <span className="font-bold text-white truncate text-sm hover:text-primary transition-colors">{user.username}</span>
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant={outgoingIds.has(String(user._id)) ? "ghost" : "default"}
                    disabled={outgoingIds.has(String(user._id))}
                    onClick={() => handleSendRequest(user.username)}
                    className="rounded-xl h-9 px-4 font-bold text-[11px] uppercase tracking-wider"
                  >
                    {outgoingIds.has(String(user._id)) ? 'GÖNDERİLDİ' : 'EKLE'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Incoming Requests */}
        <div className="space-y-4">
          <div className="px-4 flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">BEKLEYEN İSTEKLER</h2>
            {requests.incoming?.length > 0 && (
              <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {requests.incoming.length}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {requests.incoming?.map((req) => (
              <RequestItem key={req._id} request={req} onAccept={api.acceptFriendRequest} onReject={api.rejectFriendRequest} />
            ))}
            {!requests.incoming?.length && (
              <div className="p-8 border border-dashed border-white/5 rounded-[2rem] text-center">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic opacity-40">İstek yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Friend List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="px-4 flex items-center gap-3">
            <Monitor className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">ARKADAŞ LİSTESİ</h2>
            <span className="text-[10px] font-bold text-primary/60">{friends.length} TOPLAM</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {friends.map((friend) => (
              <FriendItem key={friend._id} friend={friend} presence={presence} onRemove={api.removeFriend} />
            ))}
            {!friends.length && !loading && (
              <div className="col-span-full p-20 border border-dashed border-white/5 rounded-[3rem] text-center space-y-4 bg-white/5">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] italic">Henüz kimse yok...</p>
                <Button variant="link" className="text-primary font-black uppercase tracking-widest text-[10px]" onClick={() => document.querySelector('input')?.focus()}>
                  ARKADAŞ BUL
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
