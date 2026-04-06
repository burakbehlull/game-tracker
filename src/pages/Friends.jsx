import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Link } from 'react-router-dom';

export default function Friends() {
  const { events, connected } = useWebSocket();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [presence, setPresence] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
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
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (events.friendRequest || events.friendResolved || events.friendRemoved) loadAll();
  }, [events.friendRequest, events.friendResolved, events.friendRemoved]);

  useEffect(() => {
    if (!events.presence?.userId) return;
    setPresence((prev) => ({ ...prev, [events.presence.userId]: events.presence }));
  }, [events.presence]);

  const handleSearch = async () => {
    const users = await api.searchUsers(query);
    setSearchResults(users || []);
  };

  const handleSendRequest = async (username) => {
    await api.sendFriendRequest({ username });
    await loadAll();
  };

  const handleAccept = async (requestId) => {
    await api.acceptFriendRequest(requestId);
    await loadAll();
  };

  const handleReject = async (requestId) => {
    await api.rejectFriendRequest(requestId);
    await loadAll();
  };

  const handleRemove = async (friendId) => {
    await api.removeFriend(friendId);
    await loadAll();
  };

  const outgoingIds = useMemo(
    () => new Set((requests.outgoing || []).map((r) => String(r.toUserId?._id || r.toUserId))),
    [requests.outgoing]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Arkadaşlar</h1>
          <p className="text-muted-foreground text-sm">Bağlantı: {connected ? 'Canlı' : 'Kapalı'}</p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kullanıcı adı ara..." />
          <Button onClick={handleSearch}>Ara</Button>
        </div>
        <div className="space-y-2">
          {searchResults.map((user) => (
            <div key={user._id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="font-semibold">{user.username}</div>
              <Button
                size="sm"
                disabled={outgoingIds.has(String(user._id))}
                onClick={() => handleSendRequest(user.username)}
              >
                {outgoingIds.has(String(user._id)) ? 'İstek Gönderildi' : 'Arkadaş Ekle'}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-bold">Gelen İstekler</h2>
          {(requests.incoming || []).map((req) => (
            <div key={req._id} className="flex items-center justify-between border rounded-lg p-3">
              <div>{req.fromUserId?.username}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAccept(req._id)}>
                  Kabul
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleReject(req._id)}>
                  Reddet
                </Button>
              </div>
            </div>
          ))}
          {!requests.incoming?.length && <p className="text-sm text-muted-foreground">Bekleyen istek yok.</p>}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-bold">Arkadaş Listem</h2>
          {friends.map((friend) => {
            const p = presence[String(friend._id)];
            return (
              <div key={friend._id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-semibold">{friend.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {p?.isOnline ? (p?.isPlaying ? `Playing ${p.currentGame || ''}` : 'Online') : 'Offline'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/chat">
                    <Button size="sm" variant="secondary">
                      Mesaj
                    </Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => handleRemove(friend._id)}>
                    Sil
                  </Button>
                </div>
              </div>
            );
          })}
          {!friends.length && !loading && <p className="text-sm text-muted-foreground">Henüz arkadaşın yok.</p>}
        </Card>
      </div>
    </div>
  );
}
