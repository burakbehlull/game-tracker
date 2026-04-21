import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/toaster';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { 
  Users, 
  Shield, 
  Gamepad2, 
  TrendingUp, 
  Search, 
  LogOut,
  Trash2,
  UserCog,
  Clock,
  Mail,
  Calendar,
  X,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function AdminDashboard({ adminUser, onLogout }) {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [cdnStatus, setCdnStatus] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    level: 1,
    xp: 0,
    isVerified: true
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(currentPage, searchQuery);
    } else if (activeTab === 'sessions') {
      loadSessions(currentPage);
    } else if (activeTab === 'cdn') {
      loadCDNStatus();
    }
  }, [activeTab, currentPage, searchQuery]);

  const loadCDNStatus = async () => {
    try {
      const data = await api.getCDNStatus();
      setCdnStatus(data);
    } catch (error) {
      console.error('Error loading CDN status:', error);
    }
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  });

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      level: user.level || 1,
      xp: user.xp || 0,
      isVerified: user.isVerified !== false
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editFormData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Güncelleme başarısız');
      }
      
      setEditingUser(null);
      loadUsers(currentPage, searchQuery);
      loadDashboardData();
      toast({ title: 'Başarılı', description: 'Kullanıcı başarıyla güncellendi' });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Hata', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page = 1, search = '') => {
    try {
      const res = await fetch(
        `${API_URL}/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSessions = async (page = 1) => {
    try {
      const res = await fetch(
        `${API_URL}/admin/sessions?page=${page}&limit=50`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete user');
      loadUsers(currentPage, searchQuery);
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Hata', description: 'Kullanıcı silinemedi' });
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const isCurrentlyAdmin = currentRole && currentRole.includes('admin');
    const newRole = isCurrentlyAdmin 
      ? (currentRole.filter(r => r !== 'admin'))
      : [...(currentRole || []), 'admin'];
    
    // Ensure 'user' role is always present
    if (!newRole.includes('user')) {
      newRole.push('user');
    }

    if (!confirm(`Bu kullanıcının rollerini "${newRole.join(', ')}" olarak değiştirmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      loadUsers(currentPage, searchQuery);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Hata', description: 'Roller güncellenemedi' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    onLogout();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Paneli</h1>
                <p className="text-sm text-muted-foreground">Hoş geldin, {adminUser?.username}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Kullanıcılar
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Oyun Oturumları
          </button>
          <button
            onClick={() => setActiveTab('cdn')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'cdn'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            CDN Yönetimi
          </button>
        </div>

        {/* CDN Tab */}
        {activeTab === 'cdn' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">CDN Durum Paneli</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await api.resetCDNStatus();
                    loadCDNStatus();
                    toast({ title: 'Sıfırlandı', description: 'CDN kotaları ve seçimler sıfırlandı.' });
                  } catch (err) {
                    toast({ title: 'Hata', description: err.message });
                  }
                }}
              >
                Kotaları Sıfırla
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cdnStatus.map((cdn) => (
                <Card key={cdn.id} className={cn(
                  "relative overflow-hidden border-2 transition-all",
                  cdn.isActive ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5" : "border-white/5",
                  cdn.isFull && "border-red-500/50 bg-red-500/5"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-black tracking-tight">{cdn.name}</CardTitle>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                        cdn.isFull ? "bg-red-500 text-white" : (cdn.isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground")
                      )}>
                        {cdn.isFull ? 'KOTA DOLU' : (cdn.isActive ? 'AKTİF' : 'SIRADA')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Öncelik Sırası</span>
                        <span className="text-foreground">{cdn.priority}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className={cn(
                          "h-full transition-all duration-1000",
                          cdn.isFull ? "w-full bg-red-500" : (cdn.isActive ? "w-1/2 bg-primary animate-pulse" : "w-0 bg-muted")
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <AlertCircle className="w-5 h-5" />
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Sistem Bilgisi</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-blue-400/80 font-medium leading-relaxed">
                  Görsel yükleme sistemi "Zincirleme Geçiş" (Sequential Failover) mantığıyla çalışır. 
                  Bir CDN servisinin kotası dolduğunda veya hata verdiğinde, sistem otomatik olarak bir sonraki servise kalıcı olarak geçer. 
                  Yukarıdaki panelden anlık durumu takip edebilir ve gerektiğinde kotaları manuel olarak sıfırlayabilirsiniz.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Admin Sayısı</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAdmins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Oturum</CardTitle>
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Popüler Oyun</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.topGames[0]?._id || 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Son Kayıt Olan Kullanıcılar</CardTitle>
                <CardDescription>En son sisteme katılan 10 kullanıcı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentUsers.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Level {user.level}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Games */}
            <Card>
              <CardHeader>
                <CardTitle>En Popüler Oyunlar</CardTitle>
                <CardDescription>En çok oynanan 10 oyun</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topGames.map((game, index) => (
                    <div key={game._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{game._id}</p>
                          <p className="text-sm text-muted-foreground">
                            {game.totalSessions} oturum
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.round(game.totalMinutes / 60)} saat</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kullanıcı ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Kullanıcı</th>
                        <th className="text-left p-4 font-medium">E-posta</th>
                        <th className="text-left p-4 font-medium">Rol</th>
                        <th className="text-left p-4 font-medium">Level</th>
                        <th className="text-left p-4 font-medium">Kayıt Tarihi</th>
                        <th className="text-left p-4 font-medium">Son Giriş</th>
                        <th className="text-right p-4 font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{user.username}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </td>
                          <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {(user.role || []).map(r => (
                                  <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    r === 'admin' 
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                  }`}>
                                    {r === 'admin' ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                          <td className="p-4">
                            <div className="text-sm">Level {user.level}</div>
                            <div className="text-xs text-muted-foreground">{user.xp} XP</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('tr-TR') : 'Hiç'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditClick(user)}
                                title="Kullanıcıyı Düzenle"
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleRole(user._id, user.role)}
                                title={user.role?.includes('admin') ? "Admin Yetkisini Kaldır" : "Admin Yap"}
                              >
                                <UserCog className={`h-4 w-4 ${user.role?.includes('admin') ? 'text-red-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Önceki
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sayfa {currentPage} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.pages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Sonraki
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Kullanıcı</th>
                        <th className="text-left p-4 font-medium">Oyun</th>
                        <th className="text-left p-4 font-medium">Süre</th>
                        <th className="text-left p-4 font-medium">Başlangıç</th>
                        <th className="text-left p-4 font-medium">Bitiş</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session._id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{session.userId?.username || 'Bilinmeyen'}</div>
                            <div className="text-xs text-muted-foreground">{session.userId?.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="h-4 w-4 text-primary" />
                              <span className="font-medium">{session.gameName}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium">{session.durationMinutes} dk</span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground">
                              {new Date(session.startTime).toLocaleString('tr-TR')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground">
                              {session.endTime ? new Date(session.endTime).toLocaleString('tr-TR') : 'Devam ediyor'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Önceki
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sayfa {currentPage} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.pages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Sonraki
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl border-primary/20 animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl font-bold">Kullanıcıyı Düzenle</CardTitle>
                <CardDescription>{editingUser.username} bilgilerini güncelleyin</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingUser(null)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleUpdateUser}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kullanıcı Adı</label>
                    <Input 
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-posta</label>
                    <Input 
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Level</label>
                    <Input 
                      type="number"
                      min="1"
                      value={editFormData.level}
                      onChange={(e) => setEditFormData({...editFormData, level: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">XP</label>
                    <Input 
                      type="number"
                      min="0"
                      value={editFormData.xp}
                      onChange={(e) => setEditFormData({...editFormData, xp: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {editFormData.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium">Hesap Durumu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {editFormData.isVerified ? 'Doğrulanmış' : 'Doğrulanmamış'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditFormData({...editFormData, isVerified: !editFormData.isVerified})}
                    >
                      Değiştir
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  İptal
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
