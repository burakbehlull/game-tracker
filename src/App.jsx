import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy loading components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Timer = lazy(() => import('./pages/Timer'));
const Settings = lazy(() => import('./pages/Settings'));
const Library = lazy(() => import('./pages/Library'));
const GameDetails = lazy(() => import('./pages/GameDetails'));
const Friends = lazy(() => import('./pages/Friends'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CommunityList = lazy(() => import('./pages/Community/CommunityList'));
const CreateCommunity = lazy(() => import('./pages/Community/CreateCommunity'));
const CommunityDetail = lazy(() => import('./pages/Community/CommunityDetail'));
const CommunityManage = lazy(() => import('./pages/Community/CommunityManage'));
const DiscussionDetail = lazy(() => import('./pages/Community/DiscussionDetail'));
const Matchmaking = lazy(() => import('./pages/Community/Matchmaking'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

import Layout from './components/Layout';
import { api } from './services/api';

import TitleBar from './components/TitleBar';
import UpdateNotification from './components/UpdateNotification';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastProvider, useToast } from './components/ui/toaster';
import { useWebSocket } from './contexts/WebSocketContext';

function NotificationHandler() {
  const { events } = useWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    if (events.notificationNew) {
      const n = events.notificationNew;
      let title = 'Yeni Bildirim';
      let description = '';

      switch (n.type) {
        case 'FRIEND_REQUEST':
          title = 'Arkadaş İsteği';
          description = `${n.data.senderName} size arkadaşlık isteği gönderdi.`;
          break;
        case 'FRIEND_ACCEPTED':
          title = 'İstek Kabul Edildi';
          description = `${n.data.username} arkadaşlık isteğini kabul etti!`;
          break;
        case 'MEMBER_ACCEPTED':
          title = 'Topluluk Kabulü';
          description = `${n.data.communityName} topluluğuna kabul edildin!`;
          break;
        case 'MEMBER_REJECTED':
          title = 'Topluluk Reddi';
          description = `${n.data.communityName} topluluğuna katılım isteğin reddedildi.`;
          break;
        case 'MEMBER_REQUEST':
          title = 'Yeni Katılım İsteği';
          description = `${n.data.communityName} topluluğuna yeni bir katılım isteği var.`;
          break;
        case 'MEMBER_KICKED':
          title = 'Topluluktan Uzaklaştırılma';
          description = `${n.data.communityName} topluluğundan çıkarıldın.`;
          break;
        case 'ROLE_UPDATED':
          title = 'Rolün Güncellendi';
          description = `${n.data.communityName} topluluğundaki yeni rolün: ${n.data.role}`;
          break;
        case 'NEW_MESSAGE':
          title = 'Yeni Mesaj';
          description = `${n.data.senderName}: ${n.data.messagePreview}`;
          break;
        case 'NEW_POST':
          title = 'Yeni Paylaşım';
          description = `${n.data.communityName} topluluğunda yeni konu açıldı.`;
          break;
        case 'NEW_COMMENT':
          title = 'Yeni Yorum';
          description = `${n.data.senderName}, "${n.data.discussionTitle}" konuna yorum yaptı.`;
          break;
        case 'NEW_EVENT':
          title = 'Yeni Etkinlik';
          description = `${n.data.communityName} topluluğunda "${n.data.eventTitle}" etkinliği oluşturuldu!`;
          break;
        default:
          description = 'Yeni bir aktivite var.';
      }

      toast({
        title,
        description,
        duration: 5000,
      });
    }
  }, [events.notificationNew, toast]);

  return null;
}

function App() {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    checkAuth();

    // Listen for tray logout
    if (window.electronAPI) {
      window.electronAPI.onForceLogout(() => {
        localStorage.removeItem('token');
        setUser(null);
      });
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    // 1. Optimistically send token to Electron immediately
    if (token && window.electronAPI) {
      window.electronAPI.setAuthToken(token).catch(err => console.error('Failed to sync token:', err));
    }

    try {
      if (token) {
        // 2. Then validate with backend
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
        if (window.electronAPI && currentUser?.settings) {
          window.electronAPI.setUserSettings(currentUser.settings).catch(err => console.error('Failed to sync settings:', err));
        }
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      // Only clear token on explicit 401 Unauthorized, preserve it on network errors (startup)
      if (error?.status === 401) {
        localStorage.removeItem('token');
        if (window.electronAPI) window.electronAPI.logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleAdminLogin = (userData) => {
    setAdminUser(userData);
  };

  const handleLogout = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.logout(); // IPC to clear Main Process token
      }
      localStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout hatası:', error);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminUser(null);
  };

  const isElectron = !!window.electronAPI;
  const authToken = localStorage.getItem('token');

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ToastProvider>
        {loading ? (
        isElectron ? (
          <div className="fixed inset-0 bg-background text-foreground flex flex-col items-center justify-center z-[9999]">
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
              <div className="p-5 rounded-[2rem] bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/20">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="64" 
                  height="64" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="text-primary animate-pulse"
                >
                  <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
                </svg>
              </div>
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-2xl font-black tracking-tighter">GAME TRACKER</h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Uygulama Açılıyor</p>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <WebSocketProvider token={authToken}>
          <NotificationHandler />
          <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
            <TitleBar user={user} />
            <UpdateNotification />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <Router>
                <Suspense fallback={
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Yükleniyor</p>
                  </div>
                }>
                  <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                    <Route path="/register" element={!user ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} />
                    <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
                    <Route path="/reset-password/:token" element={!user ? <ResetPassword /> : <Navigate to="/" />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin" element={!adminUser ? <AdminLogin onAdminLogin={handleAdminLogin} /> : <Navigate to="/admin/dashboard" />} />
                    <Route path="/admin/dashboard" element={adminUser ? <AdminDashboard adminUser={adminUser} onLogout={handleAdminLogout} /> : <Navigate to="/admin" />} />

                    {/* App Layout Routes */}
                    <Route element={<Layout user={user} onLogout={handleLogout} />}>
                      <Route path="/" element={<Home user={user} />} />
                      <Route path="/discover" element={<Discover />} />
                      <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                      <Route path="/profile/:username?" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
                      <Route path="/timer" element={user ? <Timer user={user} /> : <Navigate to="/login" />} />
                      <Route path="/library" element={user ? <Library user={user} /> : <Navigate to="/login" />} />
                      <Route path="/settings" element={user ? <Settings user={user} onUpdate={setUser} /> : <Navigate to="/login" />} />
                      <Route path="/friends" element={user ? <Friends user={user} /> : <Navigate to="/login" />} />
                      <Route path="/chat/:conversationId?" element={user ? <Chat user={user} /> : <Navigate to="/login" />} />
                      <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
                      <Route path="/community" element={user ? <CommunityList user={user} /> : <Navigate to="/login" />} />
                      <Route path="/community/create" element={user ? <CreateCommunity user={user} /> : <Navigate to="/login" />} />
                      <Route path="/community/:id" element={user ? <CommunityDetail user={user} /> : <Navigate to="/login" />} />
                      <Route path="/community/:id/manage" element={user ? <CommunityManage user={user} /> : <Navigate to="/login" />} />
                      <Route path="/discussion/:id" element={user ? <DiscussionDetail user={user} /> : <Navigate to="/login" />} />
                      <Route path="/matchmaking" element={user ? <Matchmaking user={user} /> : <Navigate to="/login" />} />
                      <Route path="/game/:id" element={<GameDetails />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </Router>
            </div>
          </div>
        </WebSocketProvider>
      )}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
