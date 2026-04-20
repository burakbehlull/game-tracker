import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ArrowLeft, Users2, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
    banner: '',
    settings: {
      requireApprovalForPosts: false,
      requireApprovalForMembers: false
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const community = await api.createCommunity(formData);
      navigate(`/community/${community.slug}`);
    } catch (err) {
      setError(err.message || 'Topluluk oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate('/community')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">TOPLULUK OLUŞTUR</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Kendi oyuncu grubunu kur ve yönet</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 bg-card/50 border-white/5 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Topluluk İsmi</Label>
              <Input 
                required
                placeholder="Örn: Valorant TR Topluluğu"
                className="bg-secondary/50 border-white/5 rounded-xl h-12 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Açıklama</Label>
              <textarea 
                placeholder="Topluluğun hakkında kısa bir bilgi ver..."
                className="w-full min-h-[100px] bg-secondary/50 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Avatar URL (İsteğe bağlı)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="https://..."
                  className="bg-secondary/50 border-white/5 rounded-xl pl-10"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Banner URL (İsteğe bağlı)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="https://..."
                  className="bg-secondary/50 border-white/5 rounded-xl pl-10"
                  value={formData.banner}
                  onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 border-white/5 space-y-6">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            TOPLULUK AYARLARI
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-white/5">
              <div className="space-y-0.5">
                <Label className="font-bold">Tartışma Onayı</Label>
                <p className="text-xs text-muted-foreground">Gönderiler paylaşılmadan önce moderatör onayı gereksin mi?</p>
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
                <p className="text-xs text-muted-foreground">Yeni üyeler katılmadan önce yönetici onayı gereksin mi?</p>
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

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-sm"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Topluluğu Oluştur'}
        </Button>
      </form>
    </div>
  );
}
