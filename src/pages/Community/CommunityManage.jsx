import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  ArrowLeft, 
  Users2, 
  MessageSquare, 
  Settings, 
  Check, 
  X, 
  Loader2, 
  Shield, 
  Trash2,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

export default function CommunityManage({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingDiscussions, setPendingDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    avatar: '',
    banner: '',
    settings: {
      requireApprovalForPosts: false,
      requireApprovalForMembers: false
    }
  });

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const commData = await api.getCommunityBySlug(slug);
      
      // Check if user is admin/owner
      const isAdmin = commData.ownerId._id === user?._id || commData.admins.includes(user?._id);
      if (!isAdmin) {
        navigate(`/community/${slug}`);
        return;
      }

      setCommunity(commData);
      setFormData({
        description: commData.description || '',
        avatar: commData.avatar || '',
        banner: commData.banner || '',
        settings: commData.settings
      });

      const [members, discussions] = await Promise.all([
        api.getPendingMembers(slug),
        api.getPendingDiscussions(commData._id)
      ]);

      setPendingMembers(members);
      setPendingDiscussions(discussions);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateCommunitySettings(slug, formData);
      alert('Ayarlar başarıyla güncellendi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveMember = async (userId) => {
    try {
      await api.approveMember(slug, userId);
      setPendingMembers(prev => prev.filter(m => m._id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveDiscussion = async (id) => {
    try {
      await api.approveDiscussion(id);
      setPendingDiscussions(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDiscussion = async (id) => {
    if (!window.confirm('Bu tartışmayı silmek istediğine emin misin?')) return;
    try {
      await api.deleteDiscussion(id);
      setPendingDiscussions(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm('DİKKAT: Bu topluluğu kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz!')) return;
    try {
      await api.deleteCommunity(slug);
      navigate('/community');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = community.ownerId._id === user?._id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate(`/community/${slug}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Topluluk Yönetimi</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">{community.name}</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-card/50 border border-white/5 p-1 rounded-2xl h-auto grid grid-cols-3 gap-1">
          <TabsTrigger value="settings" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary">
            <Settings className="w-4 h-4 mr-2" />
            Genel Ayarlar
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-primary relative">
            <Shield className="w-4 h-4 mr-2" />
            Onay Bekleyenler
            {(pendingMembers.length > 0 || pendingDiscussions.length > 0) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full text-white animate-pulse">
                {pendingMembers.length + pendingDiscussions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="danger" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-red-500">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Tehlikeli Bölge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <Card className="p-6 bg-card/50 border-white/5 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Açıklama</Label>
                  <textarea 
                    className="w-full min-h-[100px] bg-secondary/30 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        className="bg-secondary/30 border-white/5 rounded-xl pl-10"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Banner URL</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        className="bg-secondary/30 border-white/5 rounded-xl pl-10"
                        value={formData.banner}
                        onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 border-white/5 space-y-6">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">Gelişmiş Ayarlar</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="font-bold">Tartışma Onayı</Label>
                    <p className="text-xs text-muted-foreground">Yeni gönderiler yayınlanmadan önce onay gereksin.</p>
                  </div>
                  <Switch 
                    checked={formData.settings.requireApprovalForPosts}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, requireApprovalForPosts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="font-bold">Üyelik Onayı</Label>
                    <p className="text-xs text-muted-foreground">Yeni üyeler katılmadan önce onay gereksin.</p>
                  </div>
                  <Switch 
                    checked={formData.settings.requireApprovalForMembers}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, requireApprovalForMembers: checked }
                    })}
                  />
                </div>
              </div>
            </Card>

            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Değişiklikleri Kaydet'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-8">
          {/* Pending Members */}
          <div className="space-y-4">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">
              <Users2 className="w-5 h-5 text-primary" />
              Bekleyen Üyeler ({pendingMembers.length})
            </h3>
            {pendingMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-secondary/10 p-4 rounded-xl border border-dashed border-white/5">Bekleyen üyelik başvurusu yok.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingMembers.map(m => (
                  <Card key={m._id} className="p-4 bg-card/50 border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : m.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold">{m.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="rounded-lg h-8 w-8 p-0" onClick={() => handleApproveMember(m._id)}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0">
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pending Discussions */}
          <div className="space-y-4">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">
              <MessageSquare className="w-5 h-5 text-primary" />
              Bekleyen Tartışmalar ({pendingDiscussions.length})
            </h3>
            {pendingDiscussions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-secondary/10 p-4 rounded-xl border border-dashed border-white/5">Onay bekleyen tartışma yok.</p>
            ) : (
              <div className="space-y-4">
                {pendingDiscussions.map(d => (
                  <Card key={d._id} className="p-5 bg-card/50 border-white/5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                          {d.authorId.username[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{d.title}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yazar: {d.authorId.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl font-bold" onClick={() => handleApproveDiscussion(d._id)}>
                          Onayla
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10 rounded-xl font-bold" onClick={() => handleDeleteDiscussion(d._id)}>
                          Reddet/Sil
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{d.content}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="p-8 border-red-500/20 bg-red-500/5 space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <AlertTriangle className="w-12 h-12 shrink-0" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Tehlikeli Bölge</h3>
                <p className="text-sm font-medium opacity-80">Bu işlemler geri alınamaz. Lütfen dikkatli olun.</p>
              </div>
            </div>

            <div className="h-[1px] bg-red-500/20" />

            <div className="flex items-center justify-between gap-8">
              <div className="space-y-1">
                <h4 className="font-bold text-white">Topluluğu Sil</h4>
                <p className="text-xs text-muted-foreground">Bu topluluk ve içindeki tüm tartışmalar, yorumlar ve veriler kalıcı olarak silinecektir.</p>
              </div>
              <Button 
                variant="destructive" 
                className="rounded-xl font-black uppercase tracking-widest text-xs h-11 shrink-0 px-6"
                disabled={!isOwner}
                onClick={handleDeleteCommunity}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Topluluğu Sil
              </Button>
            </div>
            {!isOwner && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest italic">* Sadece kurucu topluluğu silebilir.</p>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
