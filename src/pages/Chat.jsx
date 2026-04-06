import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

function getConversationName(conversation) {
  if (!conversation) return '-';
  if (conversation.type === 'group' && conversation.title) return conversation.title;
  const me = localStorage.getItem('username');
  const other = (conversation.participants || []).find((p) => p.username !== me);
  return other?.username || 'DM';
}

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { events } = useWebSocket();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => String(c._id) === String(conversationId)) || null,
    [conversations, conversationId]
  );

  const loadConversations = async () => {
    const data = await api.getConversations();
    setConversations(data || []);
    if (!conversationId && data?.[0]?._id) navigate(`/chat/${data[0]._id}`);
  };

  const loadMessages = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getConversationMessages(id);
      setMessages(data || []);
      await api.markConversationRead(id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    api.getFriends().then((data) => setFriends(data || []));
  }, []);

  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (events.conversationUpdated) loadConversations();
  }, [events.conversationUpdated]);

  useEffect(() => {
    if (!events.messageNew) return;
    if (String(events.messageNew.conversationId) !== String(conversationId)) return;
    setMessages((prev) => [...prev, events.messageNew]);
  }, [events.messageNew, conversationId]);

  const handleSend = async () => {
    const value = input.trim();
    if (!value || !conversationId) return;
    const sent = await api.sendMessage(conversationId, value);
    setMessages((prev) => [...prev, sent]);
    setInput('');
  };

  const createDm = async (friendId) => {
    const conv = await api.createConversation({ type: 'dm', participantIds: [friendId] });
    await loadConversations();
    navigate(`/chat/${conv._id}`);
  };

  const createGroup = async () => {
    if (groupMembers.length < 2) return;
    const conv = await api.createConversation({
      type: 'group',
      participantIds: groupMembers,
      title: groupTitle.trim()
    });
    setGroupTitle('');
    setGroupMembers([]);
    await loadConversations();
    navigate(`/chat/${conv._id}`);
  };

  const toggleGroupMember = (id) => {
    setGroupMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)]">
      <Card className="p-3 overflow-auto space-y-2">
        <h2 className="font-bold px-2">Sohbetler</h2>
        <div className="px-2 py-2 border rounded-lg space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">DM Başlat</div>
          <div className="space-y-1 max-h-28 overflow-auto">
            {friends.map((friend) => (
              <button
                key={friend._id}
                onClick={() => createDm(friend._id)}
                className="w-full text-left text-sm border rounded px-2 py-1 hover:bg-accent"
              >
                {friend.username}
              </button>
            ))}
          </div>
        </div>
        <div className="px-2 py-2 border rounded-lg space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Grup Oluştur</div>
          <Input
            placeholder="Grup adı (opsiyonel)"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
          />
          <div className="space-y-1 max-h-24 overflow-auto">
            {friends.map((friend) => (
              <label key={friend._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={groupMembers.includes(friend._id)}
                  onChange={() => toggleGroupMember(friend._id)}
                />
                {friend.username}
              </label>
            ))}
          </div>
          <Button size="sm" className="w-full" onClick={createGroup} disabled={groupMembers.length < 2}>
            Grup Aç
          </Button>
        </div>
        {conversations.map((conversation) => (
          <button
            key={conversation._id}
            onClick={() => navigate(`/chat/${conversation._id}`)}
            className={`w-full text-left px-3 py-2 rounded-lg border ${
              String(conversation._id) === String(conversationId) ? 'bg-primary/10 border-primary/30' : ''
            }`}
          >
            <div className="font-semibold truncate">{getConversationName(conversation)}</div>
            <div className="text-xs text-muted-foreground">{conversation.type === 'group' ? 'Grup' : 'DM'}</div>
          </button>
        ))}
      </Card>

      <Card className="p-0 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b font-bold">{getConversationName(activeConversation)}</div>
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
          {!loading &&
            messages.map((message) => (
              <div key={message._id} className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</div>
                <div>{message.content}</div>
              </div>
            ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? handleSend() : null)}
            placeholder="Mesaj yaz..."
            disabled={!conversationId}
          />
          <Button onClick={handleSend} disabled={!conversationId}>
            Gönder
          </Button>
        </div>
      </Card>
    </div>
  );
}
