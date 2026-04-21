import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Gamepad2, 
  UserPlus, 
  Check, 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  MessageSquare, 
  X, 
  Heart,
  ChevronDown,
  Info,
  Send,
  Search,
  Pause,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWebSocket } from '../../contexts/WebSocketContext';

export default function Matchmaking({ user }) {
  const navigate = useNavigate();
  const { events } = useWebSocket();
  const [mode, setMode] = useState('instant'); // 'instant' or 'passive'
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [direction, setDirection] = useState(null); // 'left' or 'right'
  const [messaging, setMessaging] = useState(false);
  
  // Instant Matchmaking State
  const [instantStatus, setInstantStatus] = useState('idle'); // 'idle', 'searching', 'matched', 'timeout'
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchedConversationId, setMatchedConversationId] = useState(null);
  const searchTimerRef = useRef(null);
  
  // Mini Chat State
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  
  const menuRef = useRef(null);
  const chatEndRef = useRef(null);

  const fetchMatches = useCallback(async (gameName = '', silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getMatches(gameName || selectedGame);
      // Sadece yeni maçları ekle (mevcutları koru)
      setMatches(prev => {
        const existingIds = new Set(prev.map(m => m._id));
        const newMatches = (data || []).filter(m => !existingIds.has(m._id));
        return [...prev, ...newMatches];
      });
    } catch (err) {
      console.error('Eşleşme hatası:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedGame]);

  // Instant Matchmaking Logic
  const startInstantSearch = async () => {
    setInstantStatus('searching');
    
    // 30 saniye sonra hala eşleşme yoksa timeout'a düşür
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setInstantStatus('timeout');
      api.leaveInstantQueue().catch(console.error);
    }, 30000);

    try {
      const result = await api.joinInstantQueue(selectedGame);
      if (result.matched) {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setMatchedUser(result.otherUser);
        setMatchedConversationId(result.conversationId);
        setInstantStatus('matched');
      }
    } catch (err) {
      console.error('Anlık eşleşme başlatılamadı:', err);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      setInstantStatus('idle');
    }
  };

  const stopInstantSearch = async () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    try {
      await api.leaveInstantQueue();
    } catch (err) {
      console.error('Sıradan çıkılamadı:', err);
    }
    setInstantStatus('idle');
    setMatchedUser(null);
    setMatchedConversationId(null);
  };

  useEffect(() => {
    let interval;
    if (instantStatus === 'searching') {
      interval = setInterval(async () => {
        try {
          const result = await api.checkInstantStatus();
          if (result.matched) {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            setMatchedUser(result.otherUser);
            setMatchedConversationId(result.conversationId);
            setInstantStatus('matched');
            clearInterval(interval);
          }
        } catch (err) {
          // Eğer 404 dönerse (sıradan düşmüşsek), aramayı durdur
          if (err.status === 404) {
            stopInstantSearch();
          }
          console.error('Durum kontrol hatası:', err);
        }
      }, 2000); // 2 saniyeye düşürüldü daha hızlı tepki için
    }
    return () => {
      clearInterval(interval);
    };
  }, [instantStatus]);

  // Sayfadan ayrılırken sıradan çık
  useEffect(() => {
    return () => {
      if (instantStatus === 'searching') {
        api.leaveInstantQueue().catch(console.error);
      }
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [instantStatus]);

  // Akıllı Arama Döngüsü (Eğer maç listesi azaldıysa ara)
  useEffect(() => {
    let interval;
    if (isSearching) {
      // Hemen ilk aramayı yap
      if (matches.length - currentIndex < 3) {
        fetchMatches(selectedGame, true);
      }
      
      interval = setInterval(() => {
        // Sadece liste azaldığında veya boşsa istek at
        if (matches.length - currentIndex < 3) {
          fetchMatches(selectedGame, true);
        }
      }, 10000); // 10 saniyeye çıkarıldı (performans için)
    }
    return () => clearInterval(interval);
  }, [isSearching, selectedGame, fetchMatches, matches.length, currentIndex]);

  // Eşleşme değiştiğinde sohbeti yükle
  useEffect(() => {
    const currentMatch = matches[currentIndex];
    if (currentMatch) {
      loadMiniChat(currentMatch._id);
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [currentIndex, matches]);

  // Yeni mesajları dinle
  useEffect(() => {
    if (events.messageNew && conversation && events.messageNew.conversationId === conversation._id) {
      setMessages(prev => [...prev, events.messageNew]);
    }
  }, [events.messageNew, conversation]);

  // Chat sona kaydır
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMiniChat = async (targetUserId) => {
     setLoadingChat(true);
     try {
      const conv = await api.getOrCreateConversation(targetUserId);
      setConversation(conv);
      const msgs = await api.getConversationMessages(conv._id);
      setMessages(Array.isArray(msgs) ? msgs : (msgs.messages || []));
    } catch (err) {
       console.error('Chat yükleme hatası:', err);
     } finally {
       setLoadingChat(false);
     }
   };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    const content = newMessage;
    setNewMessage('');
    
    try {
      const msg = await api.sendMessage(conversation._id, content);
      // WebSocket zaten mesajı ekleyecek, ama anlık tepki için:
      // setMessages(prev => [...prev, msg]); 
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowGameMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (action) => {
    if (currentIndex >= matches.length) return;
    
    setDirection(action === 'like' ? 'right' : 'left');
    
    // Animasyon süresi
    setTimeout(async () => {
      if (action === 'like') {
        const currentMatch = matches[currentIndex];
        try {
          await api.sendFriendRequest({ 
            targetUserId: currentMatch._id, 
            username: currentMatch.username 
          });
          setSentRequests(prev => new Set([...prev, currentMatch._id]));
        } catch (err) {
          console.error('İstek hatası:', err);
        }
      }
      
      setDirection(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const getAvatarColor = (username = '') => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const currentMatch = matches[currentIndex];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">EŞLEŞME</h1>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">OYUN ARKADAŞINI BUL</p>
            </div>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => { setMode('instant'); stopInstantSearch(); setIsSearching(false); }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                mode === 'instant' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Anlık
            </button>
            <button
              onClick={() => { setMode('passive'); stopInstantSearch(); if (matches.length === 0) fetchMatches(); }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                mode === 'passive' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Pasif
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'passive' && (
            <Button 
              onClick={() => setIsSearching(!isSearching)}
              className={cn(
                "rounded-xl font-black text-[10px] uppercase tracking-[0.2em] h-10 px-6 gap-2 transition-all shadow-xl",
                isSearching 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
            >
              {isSearching ? (
                <><Pause className="w-3 h-3 fill-current" /> DURDUR</>
              ) : (
                <><Search className="w-3 h-3" /> BUL</>
              )}
            </Button>
          )}

          <div className="relative" ref={menuRef}>
            <Button 
              variant="secondary"
              onClick={() => setShowGameMenu(!showGameMenu)}
              className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 px-4 gap-2 border-white/5 bg-card/50"
            >
              {selectedGame || 'GENEL'}
              <ChevronDown className={cn("w-3 h-3 transition-transform", showGameMenu && "rotate-180")} />
            </Button>

            {showGameMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0d1117] border border-white/5 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setSelectedGame(''); setMatches([]); setCurrentIndex(0); if (mode === 'passive') fetchMatches(''); setShowGameMenu(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                    selectedGame === '' ? "text-primary bg-primary/5" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  Genel Eşleşme
                </button>
                <div className="h-[1px] bg-white/5 my-1" />
                {user?.library?.map((game) => (
                  <button
                    key={game.gameName}
                    onClick={() => { setSelectedGame(game.gameName); setMatches([]); setCurrentIndex(0); if (mode === 'passive') fetchMatches(game.gameName); setShowGameMenu(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors truncate",
                      selectedGame === game.gameName ? "text-primary bg-primary/5" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {game.gameName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Main Area */}
        <div className="flex-1 relative perspective-1000">
          {mode === 'instant' ? (
            /* Instant Matchmaking View */
            <div className="h-full flex flex-col items-center justify-center">
              {instantStatus === 'idle' ? (
                <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border-2 border-primary/20 shadow-2xl shadow-primary/10">
                    <Sparkles className="w-12 h-12 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">ANLIK EŞLEŞME</h2>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      Şu an aktif olan oyuncularla anında eşleş ve hemen sohbete başla!
                    </p>
                  </div>
                  <Button 
                    onClick={startInstantSearch}
                    className="h-14 px-12 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 active:scale-95 transition-all"
                  >
                    EŞLEŞMEYE BAŞLA
                  </Button>
                </div>
              ) : instantStatus === 'searching' ? (
                <div className="flex flex-col items-center space-y-8">
                  <div className="relative w-48 h-48">
                    {/* Radar Animation */}
                    <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping duration-[3000ms]" />
                    <div className="absolute inset-4 rounded-full bg-primary/10 animate-ping duration-[2000ms]" />
                    <div className="absolute inset-8 rounded-full bg-primary/20 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/50">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] animate-pulse">OYUNCU ARANIYOR</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{selectedGame || 'GENEL'} HAVUZU</p>
                  </div>
                  <Button 
                    onClick={stopInstantSearch}
                    variant="ghost"
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl px-8"
                  >
                    ARAMAYI DURDUR
                  </Button>
                </div>
              ) : instantStatus === 'matched' ? (
                /* Matched View */
                <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="relative flex items-center gap-4">
                    <div className="w-24 h-24 rounded-[2rem] bg-secondary/50 border border-white/10 flex items-center justify-center font-black text-3xl text-white shadow-2xl overflow-hidden">
                       {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl z-10 border-4 border-[#0d1117]">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-24 h-24 rounded-[2rem] bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-3xl text-primary shadow-2xl shadow-primary/20 overflow-hidden">
                       {matchedUser?.avatar ? <img src={matchedUser.avatar} className="w-full h-full object-cover" /> : matchedUser?.username?.[0]?.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">EŞLEŞME BULUNDU!</h3>
                    <p className="text-sm text-primary font-black uppercase tracking-widest">{matchedUser?.username} ile eşleştin</p>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => navigate(`/chat/${matchedConversationId}`)}
                      className="h-12 px-8 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest"
                    >
                      SOHBETE GİT
                    </Button>
                    <Button 
                      onClick={stopInstantSearch}
                      variant="secondary"
                      className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10"
                    >
                      YENİ ARAMA
                    </Button>
                  </div>
                </div>
              ) : (
                /* Timeout View */
                <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-32 h-32 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border-2 border-red-500/20 shadow-2xl shadow-red-500/10">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">EŞLEŞME YAPILAMIYOR</h2>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      Şu an sırada uygun bir oyuncu bulunamadı. Lütfen daha sonra tekrar dene veya pasif eşleştirmeyi kullan.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      onClick={startInstantSearch}
                      className="h-12 px-8 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest"
                    >
                      TEKRAR DENE
                    </Button>
                    <Button 
                      onClick={() => setMode('passive')}
                      variant="secondary"
                      className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10"
                    >
                      PASİF MODA GEÇ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Passive Matchmaking View (Existing Swiping) */
            <>
              {user?.settings?.privacy?.passiveMatchmakingEnabled === false && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 text-center max-w-sm backdrop-blur-xl">
                    <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">PASİF EŞLEŞTİRME KAPALI</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">
                      Ayarlar'dan pasif eşleştirmeyi kapatmışsın. Diğer oyuncuların seni bulabilmesi ve senin onları görebilmen için bu özelliği açmalısın.
                    </p>
                    <Link to="/settings">
                      <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest rounded-xl">
                        AYARLARA GİT
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              
              {!isSearching && matches.length === 0 ? (
                 <Card className="h-full w-full border-2 border-dashed border-white/5 bg-secondary/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-6">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                      <Search className="w-10 h-10 text-primary/40" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">PASİF EŞLEŞTİRME</h3>
                      <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                        Diğer oyuncuların profillerini incele ve beğendiklerinle eşleş!
                      </p>
                    </div>
                    <Button 
                      onClick={() => { setIsSearching(true); fetchMatches(); }}
                      className="rounded-xl font-black text-[10px] uppercase tracking-[0.2em] h-10 px-6 bg-primary"
                    >
                      KEŞFETMEYE BAŞLA
                    </Button>
                 </Card>
              ) : loading && matches.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] animate-pulse">Oyuncular aranıyor...</p>
                </div>
              ) : currentIndex < matches.length ? (
                <div className="h-full w-full flex flex-col">
                  {/* ... current swiping card logic ... */}
                  <div className="flex-1 relative">
                    {/* Next Card Preview */}
                    {currentIndex + 1 < matches.length && (
                      <Card className="absolute inset-0 bg-card/20 border-white/5 rounded-[3rem] scale-95 translate-y-4 opacity-50 -z-10" />
                    )}

                    {/* Current Card */}
                    <Card className={cn(
                      "h-full w-full bg-[#0d1117] border border-white/10 rounded-[3rem] overflow-hidden shadow-3xl flex flex-col transition-all duration-300 transform-gpu",
                      direction === 'left' && "-translate-x-[150%] -rotate-12 opacity-0",
                      direction === 'right' && "translate-x-[150%] rotate-12 opacity-0"
                    )}>
                      {/* Profile Image / Avatar */}
                      <div className="relative h-1/2 bg-secondary/20 overflow-hidden">
                        <div className={cn("w-full h-full flex items-center justify-center font-black text-8xl text-white/20", getAvatarColor(currentMatch.username))}>
                          {currentMatch.avatar ? (
                            <img src={currentMatch.avatar} className="w-full h-full object-cover" />
                          ) : currentMatch.username[0].toUpperCase()}
                        </div>
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />
                        
                        {/* Info Overlay */}
                        <div className="absolute bottom-6 left-8 right-8">
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">{currentMatch.username}</h2>
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-lg">LVL {currentMatch.level || 1}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{currentMatch.xp || 0} XP • OYUNCU</p>
                        </div>
                      </div>

                      {/* Card Details */}
                      <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                        {currentMatch.commonGames?.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="w-4 h-4 text-primary" />
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ortak Oyunlar</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {currentMatch.commonGames.slice(0, 3).map((game) => (
                                <span key={game} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider">
                                  {game}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <Link to={`/profile/${currentMatch.username}`} className="flex-1">
                            <Button variant="secondary" className="w-full h-12 rounded-2xl gap-2 font-black uppercase tracking-widest text-[10px] bg-white/5 hover:bg-white/10 border-white/5">
                              <Info className="w-4 h-4" />
                              PROFİLİ GÖR
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-8 py-6">
                    <button 
                      onClick={() => handleAction('dislike')}
                      className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-xl hover:shadow-red-500/20 active:scale-90"
                    >
                      <X className="w-8 h-8" />
                    </button>
                    
                    <button 
                      onClick={() => handleAction('like')}
                      className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-600 hover:text-white transition-all duration-300 shadow-xl hover:shadow-green-500/20 active:scale-90"
                    >
                      <Heart className="w-8 h-8 fill-current" />
                    </button>
                  </div>
                </div>
              ) : (
                <Card className="h-full w-full border-2 border-dashed border-white/5 bg-secondary/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">HERKESLE TANIŞTIN!</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      Şu an için kriterlerine uygun başka oyuncu kalmadı. Arama devam ediyor...
                    </p>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Mini Chat Panel */}
        <Card className="w-80 flex flex-col bg-card/30 border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white">HIZLI SOHBET</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">{currentMatch ? currentMatch.username : 'Bekleniyor...'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loadingChat ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !currentMatch ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Users className="w-8 h-8 text-white/10 mb-2" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sohbet etmek için bir oyuncu bul</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">İlk mesajı sen gönder!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === user._id || msg.senderId?._id === user._id;
                return (
                  <div key={msg._id || i} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] px-3 py-2 rounded-2xl text-xs font-medium",
                      isMe ? "bg-primary text-white rounded-tr-none" : "bg-white/5 text-gray-300 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/5">
            <div className="relative">
              <input 
                type="text"
                disabled={!currentMatch}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mesaj yaz..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-[11px] font-medium focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || !currentMatch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary/80 disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}


