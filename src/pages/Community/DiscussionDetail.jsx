import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loader2, ArrowLeft, Send, Trash2, MessageSquare } from 'lucide-react';

export default function DiscussionDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [disc, comms] = await Promise.all([
        api.getDiscussionById(id),
        api.getComments(id)
      ]);
      setDiscussion(disc);
      setComments(comms);
    } catch (err) {
      console.error('Fetch error:', err);
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || sending) return;

    setSending(true);
    try {
      const newComment = await api.createComment(id, commentContent);
      setComments([...comments, newComment]);
      setCommentContent('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bu yorumu silmek istediğine emin misin?')) return;
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate(`/community/${discussion.communityId.slug}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Link to="/community" className="hover:text-primary transition-colors">Topluluk</Link>
          <span>/</span>
          <Link to={`/community/${discussion.communityId.slug}`} className="hover:text-primary transition-colors">{discussion.communityId.name}</Link>
        </div>
      </div>

      <Card className="p-8 bg-card/50 border-white/5 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
            {discussion.authorId.avatar ? <img src={discussion.authorId.avatar} className="w-full h-full object-cover" /> : discussion.authorId.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">{discussion.title}</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {discussion.authorId.username} tarafından {new Date(discussion.createdAt).toLocaleDateString('tr-TR')} tarihinde paylaşıldı
            </p>
          </div>
        </div>

        <div className="h-[1px] bg-white/5" />

        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
          {discussion.content}
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-black tracking-tight uppercase">Yorumlar ({comments.length})</h2>
        </div>

        <form onSubmit={handlePostComment} className="space-y-3">
          <textarea 
            placeholder="Düşüncelerini paylaş..."
            className="w-full min-h-[100px] bg-card/50 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button disabled={sending || !commentContent.trim()} className="rounded-xl font-bold gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gönder
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {comments.map(comment => (
            <Card key={comment._id} className="p-5 bg-card/30 border-white/5 group relative">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                  {comment.authorId.avatar ? <img src={comment.authorId.avatar} className="w-full h-full object-cover" /> : comment.authorId.username[0].toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="text-primary">{comment.authorId.username}</span>
                      <span>•</span>
                      <span>{new Date(comment.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    {(user?._id === comment.authorId._id || user?.role === 'admin') && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 font-medium">{comment.content}</p>
                </div>
              </div>
            </Card>
          ))}
          {comments.length === 0 && (
            <p className="text-center py-8 text-muted-foreground font-medium italic">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
          )}
        </div>
      </div>
    </div>
  );
}
