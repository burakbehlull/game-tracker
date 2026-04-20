import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Users2, Plus, MessageSquare, ArrowRight, Loader2, Search } from 'lucide-react';

export default function CommunityList() {
  const [communities, setCommunities] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [communitiesData, feedData] = await Promise.all([
        api.getCommunities(),
        api.getCommunityFeed()
      ]);
      setCommunities(communitiesData);
      setFeed(feedData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">TOPLULUKLAR</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Yeni gruplara katıl ve tartışmalara başla</p>
        </div>
        <Link to="/community/create">
          <Button className="rounded-xl font-bold gap-2">
            <Plus className="w-4 h-4" />
            Topluluk Oluştur
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight">SON TARTIŞMALAR</h2>
          </div>
          
          {feed.length === 0 ? (
            <Card className="p-8 border-dashed flex flex-col items-center justify-center text-center bg-card/50">
              <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">Henüz bir tartışma yok.</p>
            </Card>
          ) : (
            feed.map((post) => (
              <Card key={post._id} className="p-6 bg-card/50 border-white/5 hover:border-primary/20 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    {post.communityId.avatar ? (
                      <img src={post.communityId.avatar} alt={post.communityId.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Users2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                      <Link to={`/community/${post.communityId.slug}`} className="text-primary hover:underline">
                        {post.communityId.name}
                      </Link>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      <Link to={`/community/discussion/${post._id}`}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {post.authorId.avatar ? (
                            <img src={post.authorId.avatar} alt={post.authorId.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] font-bold">{post.authorId.username[0].toUpperCase()}</div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-400">{post.authorId.username}</span>
                      </div>
                      <Link to={`/community/discussion/${post._id}`}>
                        <Button variant="ghost" size="sm" className="text-xs font-black uppercase tracking-widest gap-2">
                          Detaylar
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar: Communities List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black tracking-tight">TOPLULUKLAR</h2>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Grup ara..."
              className="w-full bg-card/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredCommunities.map((community) => (
              <Link key={community._id} to={`/community/${community.slug}`} className="block group">
                <Card className="p-4 bg-card/30 border-white/5 group-hover:border-primary/20 group-hover:bg-card/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                      {community.avatar ? (
                        <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users2 className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{community.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {community.memberCount || 0} Üye
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
