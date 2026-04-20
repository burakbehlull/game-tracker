import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  Users2, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Shield, 
  Plus, 
  Loader2, 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  Check, 
  Clock, 
  Eye, 
  Edit3, 
  X 
} from 'lucide-react';
import { renderMarkdown } from '../../lib/utils';
import CommunityManage from './CommunityManage';
import { cn } from '../../lib/utils';
export default function CommunityDetail({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discussions');
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '' });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [slug]);

  const fetchCommunity = async () => {
    try {
      const data = await api.getCommunityBySlug(slug);
      setCommunity(data);
      
      // Secondary data, don't crash everything if these fail
      try {
        const [discData, eventData] = await Promise.all([
          api.getDiscussions(slug),
          api.getEvents(slug)
        ]);
        setDiscussions(discData || []);
        setEvents(eventData || []);
      } catch (err) {
        console.warn('Secondary data fetch error:', err);
      }
    } catch (err) {
      console.error('Core community fetch error:', err);
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return navigate('/login');
    setIsJoining(true);
    try {
      const result = await api.joinCommunity(slug);
      if (result.status === 'joined') {
        fetchCommunity();
      } else {
        alert('Katılma isteğin gönderildi ve onay bekliyor.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Bu topluluktan ayrılmak istediğine emin misin?')) return;
    try {
      await api.leaveCommunity(slug);
      fetchCommunity();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) return;
    setCreating(true);
    try {
      const disc = await api.createDiscussion(slug, {
        title: newDiscussion.title,
        content: newDiscussion.content
      });
      if (disc.approved) {
        setDiscussions([disc, ...discussions]);
        alert('Tartışma başarıyla oluşturuldu.');
      } else {
        alert('Tartışma oluşturuldu ve onay için moderatöre gönderildi.');
      }
      setShowCreateModal(false);
      setNewDiscussion({ title: '', content: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.description.trim() || !newEvent.date) return;
    setCreating(true);
    try {
      const event = await api.createEvent(slug, {
        ...newEvent
      });
      setEvents([...events, event]);
      alert('Etkinlik başarıyla oluşturuldu.');
      setShowEventModal(false);
      setNewEvent({ title: '', description: '', date: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDiscussion = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Bu tartışmayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteDiscussion(slug, id);
      setDiscussions(discussions.filter(d => d._id !== id));
    } catch (err) {
      console.error('Silme hatası:', err);
      alert('Tartışma silinirken bir hata oluştu.');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteEvent(slug, id);
      setEvents(events.filter(e => e._id !== id));
    } catch (err) {
      console.error('Silme hatası:', err);
      alert('Etkinlik silinirken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMember = community?.members?.some(m => String(m._id || m) === String(user?._id));
  const isPending = community?.pendingMembers?.some(m => String(m._id || m) === String(user?._id));
  const isOwner = community?.ownerId?._id === user?._id;
  const isAdmin = isOwner || community?.admins?.some(a => String(a._id || a) === String(user?._id));
  const isModerator = community?.moderators?.some(m => String(m._id || m) === String(user?._id));
  const isStaff = isAdmin || isModerator;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Banner & Profile Header */}
      <div className="relative group">
        <div className="h-48 md:h-64 rounded-[2.5rem] bg-secondary/30 border border-white/5 overflow-hidden relative">
          {community.banner ? (
            <img src={community.banner} alt={community.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <div className="absolute -bottom-8 left-8 flex items-end gap-6 w-[calc(100%-4rem)]">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-card border-4 border-background shadow-2xl flex items-center justify-center overflow-hidden shrink-0 z-10">
            {community.avatar ? (
              <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <Users2 className="w-12 h-12 text-primary" />
            )}
          </div>
          <div className="pb-2 flex-1 min-w-0 relative">
            <div className="flex items-center gap-4 mb-1">
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white drop-shadow-md truncate">
                {community.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-8 flex items-center gap-3">
          {isMember ? (
            <>
              <Button variant="secondary" className="rounded-xl font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 cursor-default">
                <Check className="w-4 h-4 mr-2" />
                Katıldın
              </Button>
              {!isOwner && (
                <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={handleLeave}>Ayrıl</Button>
              )}
            </>
          ) : isPending ? (
            <Button variant="secondary" className="rounded-xl font-bold bg-amber-500/10 text-amber-500 border-amber-500/20 cursor-default">
              <Clock className="w-4 h-4 mr-2" />
              İstek Gönderildi
            </Button>
          ) : (
            <Button 
              className="rounded-xl font-bold px-8 h-11" 
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Topluluğa Katıl'}
            </Button>
          )}
        </div>
      </div>

      <div className="pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground relative mb-2">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/10 -z-10" />
            <span className="flex items-center gap-1.5 text-primary bg-[#0d1117] px-3 py-1 rounded-full border border-primary/20 z-10">
              <Users2 className="w-3 h-3" />
              {community.members.length} Üye
            </span>
            <span className="bg-[#0d1117] px-2 z-10">•</span>
            <span className="bg-[#0d1117] pr-3 py-1 z-10 text-gray-400">
              Kurucu: <span className="text-white">{community?.ownerId?.username || 'Bilinmiyor'}</span>
            </span>
          </div>
          <Card className="p-6 bg-card/50 border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hakkında</h3>
            <p className="text-sm font-medium leading-relaxed text-gray-300">
              {community.description || 'Bu topluluk hakkında henüz bir açıklama girilmemiş.'}
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Yöneticiler</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                  {community?.ownerId?.avatar ? <img src={community.ownerId.avatar} className="w-full h-full object-cover" /> : (community?.ownerId?.username?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{community?.ownerId?.username || 'Kurucu'}</p>
                  <p className="text-[9px] font-black text-primary uppercase">Kurucu</p>
                </div>
              </div>
              {/* Other admins/mods mapping here */}
            </div>
          </Card>
        </div>

        {/* Right Column: Tabs Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card/50 border border-white/5 p-1 rounded-2xl w-full md:w-auto h-auto grid grid-cols-3 md:flex gap-1">
              <TabsTrigger value="discussions" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary">
                <MessageSquare className="w-4 h-4 mr-2 hidden md:inline" />
                Tartışmalar
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary">
                <Calendar className="w-4 h-4 mr-2 hidden md:inline" />
                Etkinlikler
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary">
                <Users2 className="w-4 h-4 mr-2 hidden md:inline" />
                Üyeler
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="manage" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary">
                  <Settings className="w-4 h-4 mr-2 hidden md:inline" />
                  Yönetim
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="discussions" className="space-y-4 focus-visible:outline-none">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black tracking-tight uppercase">Tartışmalar</h2>
                {isMember && (
                  <Button size="sm" className="rounded-xl font-bold gap-2" onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4" />
                    Yeni Konu
                  </Button>
                )}
              </div>

              {discussions.length === 0 ? (
                <Card className="p-12 border-dashed flex flex-col items-center justify-center text-center bg-card/20">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Henüz bir tartışma başlatılmamış.</p>
                </Card>
              ) : (
                discussions.map(disc => (
                  <Link key={disc._id} to={`/community/discussion/${disc._id}`}>
                    <Card className="p-5 bg-card/50 border-white/5 hover:border-primary/20 transition-all group mb-4 relative">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                           {disc.authorId?.avatar ? <img src={disc.authorId.avatar} className="w-full h-full object-cover" /> : (disc.authorId?.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                              <span className="text-primary">{disc.authorId?.username || 'Bilinmeyen'}</span>
                              <span>•</span>
                              <span>{new Date(disc.createdAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                            {(isStaff || disc.authorId?._id === user?._id) && (
                              <button 
                                onClick={(e) => handleDeleteDiscussion(disc._id, e)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-2">{disc.title}</h3>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {disc.content.replace(/[#*`]/g, '')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>

            <TabsContent value="events" className="focus-visible:outline-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black tracking-tight uppercase">Yaklaşan Etkinlikler</h2>
                {isStaff && (
                  <Button size="sm" className="rounded-xl font-bold gap-2" onClick={() => setShowEventModal(true)}>
                    <Plus className="w-4 h-4" />
                    Etkinlik Oluştur
                  </Button>
                )}
              </div>

              {events.length === 0 ? (
                <Card className="p-12 border-dashed flex flex-col items-center justify-center text-center bg-card/20">
                  <Calendar className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Yaklaşan etkinlik bulunmuyor.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map(event => (
                    <Card key={event._id} className="p-5 bg-card/50 border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {new Date(event.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {(isStaff || event.createdBy?._id === user?._id) && (
                            <button 
                              onClick={() => handleDeleteEvent(event._id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight">{event.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                          {event.createdBy?.avatar ? <img src={event.createdBy.avatar} className="w-full h-full object-cover" /> : (event.createdBy?.username?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Düzenleyen: {event.createdBy?.username || 'Bilinmiyor'}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="focus-visible:outline-none">
               <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {community.membersList?.map(member => (
                    <Card key={member._id} className="p-4 bg-card/50 border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : member.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{member.username}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          {community.ownerId._id === member._id ? 'Kurucu' : community.admins.includes(member._id) ? 'Admin' : 'Üye'}
                        </p>
                      </div>
                    </Card>
                  ))}
               </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="manage" className="focus-visible:outline-none">
                <CommunityManage user={user} communityData={community} onUpdate={fetchCommunity} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Create Discussion Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <Card className="relative w-full max-w-lg bg-card border-white/5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight uppercase">Yeni Tartışma Başlat</h2>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateDiscussion} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Başlık</label>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Markdown Desteklenir</span>
                  </div>
                  <Input 
                    required
                    placeholder="Tartışma başlığı..."
                    className="bg-secondary/30 border-white/5 rounded-xl h-12 font-bold"
                    value={newDiscussion.title}
                    onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">İçerik</label>
                    <div className="flex bg-secondary/30 p-0.5 rounded-lg border border-white/5">
                      <button 
                        type="button"
                        onClick={() => setIsPreview(false)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                          !isPreview ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                        )}
                      >
                        <Edit3 className="w-3 h-3" />
                        DÜZENLE
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsPreview(true)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                          isPreview ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                        )}
                      >
                        <Eye className="w-3 h-3" />
                        ÖNİZLEME
                      </button>
                    </div>
                  </div>

                  {isPreview ? (
                    <div className="w-full min-h-[150px] bg-secondary/10 border border-white/5 rounded-xl p-4 text-sm font-medium prose prose-invert max-w-none overflow-y-auto max-h-[300px]">
                      {renderMarkdown(newDiscussion.content) || <span className="italic text-muted-foreground">Önizleme yapılacak bir şey yok...</span>}
                    </div>
                  ) : (
                    <textarea 
                      required
                      placeholder="Ne hakkında konuşmak istersin? **Kalın**, *İtalik*, - Liste gibi markdown formatlarını kullanabilirsin."
                      className="w-full min-h-[150px] bg-secondary/30 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium resize-none"
                      value={newDiscussion.content}
                      onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                    />
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
                  disabled={creating}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Paylaş'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowEventModal(false)} />
          <Card className="relative w-full max-w-lg bg-card border-white/5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight uppercase">Yeni Etkinlik Düzenle</h2>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowEventModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Etkinlik Başlığı</Label>
                  <Input 
                    required
                    placeholder="Örn: Hafta Sonu Turnuvası"
                    className="bg-secondary/30 border-white/5 rounded-xl h-12 font-bold"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Açıklama</Label>
                  <textarea 
                    required
                    placeholder="Etkinlik detayları..."
                    className="w-full min-h-[100px] bg-secondary/30 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tarih ve Saat</Label>
                  <Input 
                    required
                    type="datetime-local"
                    className="bg-secondary/30 border-white/5 rounded-xl h-12 font-bold"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
                  disabled={creating}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Etkinliği Oluştur'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
