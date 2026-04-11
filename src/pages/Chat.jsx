import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Send, PlusCircle, MessageSquare, AtSign, X, Check, Users, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

// --- YARDIMCI FONKSİYONLAR ---
function getConversationName(conversation, currentUsername) {
  if (!conversation) return '-';
  if (conversation.type === 'group' && conversation.title) return conversation.title;
  const other = (conversation.participants || []).find((p) => p.username !== currentUsername);
  return other?.username || 'DM';
}

function getAvatarColor(username = '') {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// --- MODAL BİLEŞENİ ---
const CreateGroupModal = memo(({ isOpen, onClose, friends, onCreate }) => {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState([]);

  if (!isOpen) return null;

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected.length < 2 || !title.trim()) return;
    onCreate(title.trim(), selected);
    setTitle('');
    setSelected([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-[#1a1d23] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
          <h2 className="text-xl font-black text-white italic flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            GRUP OLUŞTUR
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Grup Başlığı</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Grup ismini yaz..." 
              className="bg-secondary/20 border-white/5 rounded-2xl h-12 italic"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Üyeleri Seç (Min. 2)</label>
            <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-none pr-1">
              {friends.map(f => (
                <div 
                  key={f._id} 
                  onClick={() => toggleSelect(f._id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border",
                    selected.includes(f._id) ? "bg-primary/10 border-primary/20" : "bg-white/5 border-transparent hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs", getAvatarColor(f.username))}>
                      {f.username[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-white text-sm">{f.username}</span>
                  </div>
                  {selected.includes(f._id) && <Check className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={selected.length < 2 || !title.trim()} 
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/80 text-white font-black italic tracking-tighter shadow-xl shadow-primary/20"
          >
            OLUŞTUR
          </Button>
        </form>
      </Card>
    </div>
  );
});

// --- OPTİMİZE EDİLMİŞ ALT BİLEŞENLER ---

const ConversationsSidebar = memo(({ conversations, activeId, onSelect, currentUsername, friends, onCreateDm, onOpenGroupModal }) => (
  <div className="w-80 flex flex-col gap-4 shrink-0">
    <Card className="flex-1 flex flex-col overflow-hidden bg-card border-white/5 rounded-[2rem]">
      <div className="p-6 border-b border-white/5 bg-primary/5 shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-3 italic">
          <MessageSquare className="w-6 h-6 text-primary" />
          MESAJLAR
        </h2>
        <Button variant="ghost" size="icon" onClick={onOpenGroupModal} className="rounded-xl hover:bg-primary/10 text-primary">
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
        <div className="space-y-3">
          <div className="px-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Hızlı Başlat</div>
          <div className="grid grid-cols-4 gap-2">
            {friends.slice(0, 4).map((f) => (
              <button key={f._id} onClick={() => onCreateDm(f._id)} className="aspect-square rounded-2xl bg-secondary/20 hover:bg-primary/20 border border-white/5 flex items-center justify-center transition-colors group">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-transform group-hover:scale-110", getAvatarColor(f.username))}>
                  {f.username[0].toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="px-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sohbet Geçmişi</div>
          {conversations.map((conv) => {
            const isActive = String(conv._id) === String(activeId);
            const name = getConversationName(conv, currentUsername);
            return (
              <button key={conv._id} onClick={() => onSelect(conv._id)} className={cn("w-full flex items-center gap-4 px-4 py-4 rounded-[1.5rem] transition-all group", isActive ? "bg-primary text-white" : "bg-secondary/10 text-muted-foreground hover:bg-secondary/20 hover:text-white border border-white/5")}>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg", isActive ? "bg-white/20" : "bg-primary/10 text-primary")}>
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm truncate">{name}</div>
                  <div className="text-[10px] font-bold uppercase opacity-60">{conv.type === 'group' ? 'Grup' : 'DM'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  </div>
));

const MessageInput = memo(({ onSend, disabled, placeholder }) => {
  const inputRef = useRef(null);
  const handleSend = (e) => {
    if (e) e.preventDefault();
    const value = inputRef.current?.value || '';
    if (value.trim() && !disabled) {
      onSend(value.trim());
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  return (
    <form onSubmit={handleSend} className="bg-secondary/20 rounded-[2rem] p-2 flex items-center gap-2 border border-white/5 focus-within:border-primary/50 transition-colors">
      <Button type="button" variant="ghost" size="icon" className="rounded-2xl text-muted-foreground hover:text-primary shrink-0"><PlusCircle className="w-6 h-6" /></Button>
      <input ref={inputRef} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder={placeholder} className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2 font-medium italic" disabled={disabled} />
      <Button type="submit" disabled={disabled} className="bg-primary hover:bg-primary/80 text-white rounded-2xl px-6 h-12 font-black italic tracking-tighter shrink-0 transition-colors">
        <span className="hidden sm:inline">GÖNDER</span>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
});

const MessageItem = memo(({ message, senderName, isMe, showHeader, onDelete }) => (
  <div className={cn("flex flex-col", isMe ? "items-end" : "items-start", !showHeader && "-mt-6")}>
    {showHeader && (
      <div className={cn("flex items-center gap-3 mb-2 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary text-xs border border-primary/20", getAvatarColor(senderName))}>{senderName[0].toUpperCase()}</div>
        <span className="font-black text-white text-[11px] uppercase tracking-widest">{senderName}</span>
        <span className="text-[9px] font-bold text-muted-foreground opacity-60">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )}
    <div className={cn("max-w-[80%] px-6 py-4 text-sm relative group transition-colors", isMe ? "bg-primary text-white rounded-t-[1.5rem] rounded-bl-[1.5rem] rounded-br-[0.5rem]" : "bg-secondary/20 text-gray-200 border border-white/5 rounded-t-[1.5rem] rounded-br-[1.5rem] rounded-bl-[0.5rem]")}>
      <div className="break-words whitespace-pre-wrap leading-relaxed font-medium italic">{message.content}</div>
      
      {/* Time and Actions Container inside tooltip area */}
      <div className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2", isMe ? "-left-20 flex-row-reverse" : "-right-16")}>
        {!showHeader && (
          <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground whitespace-nowrap">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {isMe && (
          <button 
            onClick={() => onDelete(message._id)} 
            className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            title="Mesajı Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  </div>
));

const MessageList = memo(({ messages, loading, getMessageSenderName, currentUser, onDeleteMessage }) => {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  if (loading) return <div className="flex flex-col items-center justify-center h-full gap-4"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Yükleniyor</span></div>;
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
      {messages.map((m, i) => {
        const sender = getMessageSenderName(m);
        const isMe = currentUser && String(m.senderId) === String(currentUser.id || currentUser._id);
        const showH = i === 0 || messages[i-1].senderId !== m.senderId || (new Date(m.createdAt) - new Date(messages[i-1].createdAt) > 300000);
        return <MessageItem key={m._id} message={m} senderName={sender} isMe={isMe} showHeader={showH} onDelete={onDeleteMessage} />;
      })}
    </div>
  );
});

export default function Chat({ user }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { events } = useWebSocket();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [presence, setPresence] = useState({});
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const activeConversation = useMemo(() => conversations.find((c) => String(c._id) === String(conversationId)) || null, [conversations, conversationId]);

  const otherParticipant = useMemo(() => {
    if (!activeConversation || activeConversation.type === 'group') return null;
    return activeConversation.participants?.find(p => String(p._id || p) !== String(user?.id || user?._id));
  }, [activeConversation, user]);

  const activePresence = useMemo(() => {
    if (!otherParticipant) return null;
    return presence[String(otherParticipant._id || otherParticipant)];
  }, [otherParticipant, presence]);

  const loadConversations = useCallback(async (shouldSelectDefault = false) => {
    const data = await api.getConversations();
    setConversations(data || []);
    if (shouldSelectDefault && !conversationId && data?.[0]?._id) navigate(`/chat/${data[0]._id}`, { replace: true });
  }, [conversationId, navigate]);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getConversationMessages(id);
      setMessages(data || []);
      api.markConversationRead(id);
    } finally { setLoading(false); }
  }, []);

  const loadPresence = useCallback(async () => {
    try {
      const data = await api.getFriendsPresence();
      const map = {};
      (data || []).forEach(p => map[String(p.userId)] = p);
      setPresence(map);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadConversations(true); api.getFriends().then(setFriends); loadPresence(); }, []);
  useEffect(() => { loadMessages(conversationId); }, [conversationId, loadMessages]);
  useEffect(() => { if (events.conversationUpdated) loadConversations(); }, [events.conversationUpdated, loadConversations]);
  useEffect(() => { if (events.presence?.userId) setPresence(prev => ({ ...prev, [String(events.presence.userId)]: events.presence })); }, [events.presence]);
  
  useEffect(() => { 
    if (events.messageNew && String(events.messageNew.conversationId) === String(conversationId)) {
      setMessages(p => [...p, events.messageNew]); 
    }
  }, [events.messageNew, conversationId]);

  useEffect(() => {
    if (events.messageDeleted && String(events.messageDeleted.conversationId) === String(conversationId)) {
      setMessages(p => p.filter(m => String(m._id) !== String(events.messageDeleted.messageId)));
    }
  }, [events.messageDeleted, conversationId]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await api.deleteMessage(conversationId, messageId);
      setMessages(p => p.filter(m => String(m._id) !== String(messageId)));
    } catch (err) {
      console.error('Mesaj silinemedi', err);
    }
  }, [conversationId]);

  const handleSend = useCallback(async (content) => {
    if (!content || !conversationId) return;
    const sent = await api.sendMessage(conversationId, content);
    setMessages(p => [...p, sent]);
  }, [conversationId]);

  const handleCreateGroup = useCallback(async (title, participantIds) => {
    try {
      const conv = await api.createConversation({ type: 'group', title, participantIds });
      await loadConversations();
      navigate(`/chat/${conv._id}`);
    } catch (err) { console.error(err); }
  }, [loadConversations, navigate]);

  const getMessageSenderName = useCallback((m) => {
    if (m.sender?.username) return m.sender.username;
    const s = activeConversation?.participants?.find(p => String(p._id || p) === String(m.senderId));
    if (s?.username) return s.username;
    if (user && String(m.senderId) === String(user.id || user._id)) return user.username;
    return 'Bilinmeyen Kullanıcı';
  }, [activeConversation, user]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden relative">
      <CreateGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        friends={friends} 
        onCreate={handleCreateGroup} 
      />

      <ConversationsSidebar 
        conversations={conversations} 
        activeId={conversationId} 
        onSelect={id => navigate(`/chat/${id}`)} 
        currentUsername={user?.username} 
        friends={friends} 
        onCreateDm={fid => api.createConversation({ type: 'dm', participantIds: [fid] }).then(c => { loadConversations(); navigate(`/chat/${c._id}`); })} 
        onOpenGroupModal={() => setIsGroupModalOpen(true)}
      />

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border-white/5 rounded-[2.5rem]">
          <div className="h-20 flex items-center px-8 border-b border-white/5 bg-primary/5 shrink-0">
            <div className="flex-1 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><AtSign className="w-6 h-6" /></div>
              <div>
                <h3 className="font-black text-white text-lg truncate">{getConversationName(activeConversation, user?.username)}</h3>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", activePresence?.isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-500")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", activePresence?.isOnline ? "text-primary" : "text-muted-foreground opacity-60")}>
                    {activePresence?.isOnline ? (activePresence.isPlaying ? `OYNUYOR: ${activePresence.currentGame}` : "ÇEVRİMİÇİ") : "ÇEVRİMDIŞI"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <MessageList messages={messages} loading={loading} getMessageSenderName={getMessageSenderName} currentUser={user} onDeleteMessage={handleDeleteMessage} />
          <div className="p-8 shrink-0 bg-gradient-to-t from-black/10 to-transparent">
            <MessageInput onSend={handleSend} disabled={!conversationId} placeholder={`${getConversationName(activeConversation, user?.username)} kanalına fısılda...`} />
          </div>
        </Card>
      </div>
    </div>
  );
}
