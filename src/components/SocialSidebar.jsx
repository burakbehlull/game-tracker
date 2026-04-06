import { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Users, MessageSquare, Circle, Search, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SocialSidebar() {
  const { events, connected } = useWebSocket();
  const [friends, setFriends] = useState([]);
  const [presence, setPresence] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSocialData = async () => {
    try {
      const [friendsData, presenceData] = await Promise.all([
        api.getFriends(),
        api.getFriendsPresence()
      ]);
      setFriends(friendsData || []);
      const map = {};
      (presenceData || []).forEach((item) => {
        map[item.userId] = item;
      });
      setPresence(map);
    } catch (error) {
      console.error('Social data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSocialData();
  }, []);

  useEffect(() => {
    if (events.friendResolved || events.friendRemoved) loadSocialData();
  }, [events.friendResolved, events.friendRemoved]);

  useEffect(() => {
    if (!events.presence?.userId) return;
    setPresence((prev) => ({ ...prev, [events.presence.userId]: events.presence }));
  }, [events.presence]);

  if (loading) return null;

  return (
    <div className="w-64 bg-card border-l flex flex-col h-full hidden lg:flex">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Users className="w-4 h-4 text-primary" />
          Arkadaşlar
        </h2>
        <Link to="/friends">
          <UserPlus className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {friends.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-muted-foreground italic">Henüz arkadaşın yok.</p>
            <Link to="/friends" className="text-xs text-primary hover:underline mt-2 inline-block">
              Arkadaş Bul
            </Link>
          </div>
        ) : (
          friends.map((friend) => {
            const p = presence[String(friend._id)];
            const isOnline = p?.isOnline;
            const isPlaying = p?.isPlaying;

            return (
              <Link
                key={friend._id}
                to={`/chat/${friend._id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="text-xs font-bold text-primary">
                      {friend.username.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    isOnline ? "bg-green-500" : "bg-gray-500"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {friend.username}
                  </div>
                  <div className="text-[10px] truncate text-muted-foreground">
                    {isOnline ? (
                      isPlaying ? (
                        <span className="text-primary font-medium">Oynuyor: {p.currentGame}</span>
                      ) : (
                        "Çevrimiçi"
                      )
                    ) : (
                      "Çevrimdışı"
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="p-4 border-t bg-secondary/20">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
          {connected ? "Sunucuya Bağlı" : "Bağlantı Kesildi"}
        </div>
      </div>
    </div>
  );
}
