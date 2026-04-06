import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Send, PlusCircle, MessageSquare, AtSign } from 'lucide-react';
import { cn } from '../lib/utils';

// --- YARDIMCI FONKSİYONLAR ---
function getConversationName(conversation, currentUsername) {
  if (!conversation) return '-';
  if (conversation.type === 'group' && conversation.title) return conversation.title;
  const other = (conversation.participants || []).find((p) => p.username !== currentUsername);
  return other?.username || 'DM';
}

// --- OPTİMİZE EDİLMİŞ ALT BİLEŞENLER ---

const ConversationsSidebar = memo(({ conversations, activeId, onSelect, currentUsername, friends, onCreateDm }) => (
  <div className="w-80 flex flex-col gap-4 shrink-0">
    <Card className="flex-1 flex flex-col overflow-hidden bg-card border-white/5 rounded-[2rem]">
      <div className="p-6 border-b border-white/5 bg-primary/5 shrink-0">
        <h2 className="text-xl font-black text-white flex items-center gap-3 italic">
          <MessageSquare className="w-6 h-6 text-primary" />
          MESAJLAR
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
        <div className="space-y-3">
          <div className="px-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Hızlı Başlat</div>
          <div className="grid grid-cols-4 gap-2">
            {friends.slice(0, 4).map((f) => (
              <button key={f._id} onClick={() => onCreateDm(f._id)} className="aspect-square rounded-2xl bg-secondary/20 hover:bg-primary/20 border border-white/5 flex items-center justify-center transition-colors group">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
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
              <button key={conv._id} onClick={() => onSelect(conv._id)} className={cn("w-full flex items-center gap-4 px-4 py-4 rounded-[1.5rem] transition-colors group", isActive ? "bg-primary text-white" : "bg-secondary/10 text-muted-foreground hover:bg-secondary/20 hover:text-white border border-white/5")}>
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

const MessageItem = memo(({ message, senderName, isMe, showHeader }) => (
  <div className={cn("flex flex-col", isMe ? "items-end" : "items-start", !showHeader && "-mt-6")}>
    {showHeader && (
      <div className={cn("flex items-center gap-3 mb-2 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary text-xs border border-primary/20">{senderName[0].toUpperCase()}</div>
        <span className="font-black text-white text-[11px] uppercase tracking-widest">{senderName}</span>
        <span className="text-[9px] font-bold text-muted-foreground opacity-60">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )}
    <div className={cn("max-w-[80%] px-6 py-4 text-sm relative group transition-colors", isMe ? "bg-primary text-white rounded-t-[1.5rem] rounded-bl-[1.5rem] rounded-br-[0.5rem]" : "bg-secondary/20 text-gray-200 border border-white/5 rounded-t-[1.5rem] rounded-br-[1.5rem] rounded-bl-[0.5rem]")}>
      <div className="break-words whitespace-pre-wrap leading-relaxed font-medium italic">{message.content}</div>
      {!showHeader && (
        <div className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-tighter text-muted-foreground", isMe ? "-left-12 text-right" : "-right-12 text-left")}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  </div>
));

const MessageList = memo(({ messages, loading, getMessageSenderName, currentUser }) => {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  if (loading) return <div className="flex flex-col items-center justify-center h-full gap-4"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Yükleniyor</span></div>;
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
      {messages.map((m, i) => {
        const sender = getMessageSenderName(m);
        const isMe = currentUser && String(m.senderId) === String(currentUser.id || currentUser._id);
        const showH = i === 0 || messages[i-1].senderId !== m.senderId || (new Date(m.createdAt) - new Date(messages[i-1].createdAt) > 300000);
        return <MessageItem key={m._id} message={m} senderName={sender} isMe={isMe} showHeader={showH} />;
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

  const activeConversation = useMemo(() => conversations.find((c) => String(c._id) === String(conversationId)) || null, [conversations, conversationId]);

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

  useEffect(() => { loadConversations(true); api.getFriends().then(setFriends); }, []);
  useEffect(() => { loadMessages(conversationId); }, [conversationId, loadMessages]);
  useEffect(() => { if (events.conversationUpdated) loadConversations(); }, [events.conversationUpdated, loadConversations]);
  useEffect(() => { if (events.messageNew && String(events.messageNew.conversationId) === String(conversationId)) setMessages(p => [...p, events.messageNew]); }, [events.messageNew, conversationId]);

  const handleSend = useCallback(async (content) => {
    if (!content || !conversationId) return;
    const sent = await api.sendMessage(conversationId, content);
    setMessages(p => [...p, sent]);
  }, [conversationId]);

  const getMessageSenderName = useCallback((m) => {
    if (m.sender?.username) return m.sender.username;
    const s = activeConversation?.participants?.find(p => String(p._id || p) === String(m.senderId));
    if (s?.username) return s.username;
    if (user && String(m.senderId) === String(user.id || user._id)) return user.username;
    return 'Bilinmeyen Kullanıcı';
  }, [activeConversation, user]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      <ConversationsSidebar conversations={conversations} activeId={conversationId} onSelect={id => navigate(`/chat/${id}`)} currentUsername={user?.username} friends={friends} onCreateDm={fid => api.createConversation({ type: 'dm', participantIds: [fid] }).then(c => { loadConversations(); navigate(`/chat/${c._id}`); })} />
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border-white/5 rounded-[2.5rem]">
          <div className="h-20 flex items-center px-8 border-b border-white/5 bg-primary/5 shrink-0">
            <div className="flex-1 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><AtSign className="w-6 h-6" /></div>
              <div>
                <h3 className="font-black text-white text-lg truncate">{getConversationName(activeConversation, user?.username)}</h3>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-black text-primary uppercase tracking-widest">Çevrimiçi</span></div>
              </div>
            </div>
          </div>
          <MessageList messages={messages} loading={loading} getMessageSenderName={getMessageSenderName} currentUser={user} />
          <div className="p-8 shrink-0 bg-gradient-to-t from-black/10 to-transparent">
            <MessageInput onSend={handleSend} disabled={!conversationId} placeholder={`${getConversationName(activeConversation, user?.username)} kanalına fısılda...`} />
          </div>
        </Card>
      </div>
    </div>
  );
}
