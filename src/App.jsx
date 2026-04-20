import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Timer from './pages/Timer';
import Settings from './pages/Settings';
import Library from './pages/Library';
import GameDetails from './pages/GameDetails';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import CommunityList from './pages/Community/CommunityList';
import CreateCommunity from './pages/Community/CreateCommunity';
import CommunityDetail from './pages/Community/CommunityDetail';
import CommunityManage from './pages/Community/CommunityManage';
import DiscussionDetail from './pages/Community/DiscussionDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import { api } from './services/api';

import TitleBar from './components/TitleBar';
import UpdateNotification from './components/UpdateNotification';
import { WebSocketProvider } from './contexts/WebSocketContext';

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
    <ThemeProvider>
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
          <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            <TitleBar />
            <UpdateNotification />
            <div className="flex-1 overflow-auto">
              <Router>
                <Routes>
                <Route 
                  path="/login" 
                  element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/register" 
                  element={!user ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/forgot-password" 
                  element={!user ? <ForgotPassword /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/reset-password/:token" 
                  element={!user ? <ResetPassword /> : <Navigate to="/" />} 
                />
                <Route 
                  path="/admin" 
                  element={!adminUser ? <AdminLogin onAdminLogin={handleAdminLogin} /> : <Navigate to="/admin/dashboard" />} 
                />
                <Route 
                  path="/admin/dashboard" 
                  element={adminUser ? <AdminDashboard adminUser={adminUser} onLogout={handleAdminLogout} /> : <Navigate to="/admin" />} 
                />
                <Route
                  path="/"
                  element={
                    <Layout user={user} onLogout={handleLogout}>
                      <Home user={user} />
                    </Layout>
                  }
                />
                <Route
                  path="/discover"
                  element={
                    <Layout user={user} onLogout={handleLogout}>
                      <Discover />
                    </Layout>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Dashboard user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/profile/:username?"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Profile user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/timer"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Timer user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/settings"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Settings user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/library"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Library user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route 
                  path="/games/:gameName" 
                  element={
                    <Layout user={user} onLogout={handleLogout}>
                      <GameDetails />
                    </Layout>
                  } 
                />
                <Route
                  path="/friends"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Friends />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/chat/:conversationId?"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <Chat user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/community"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <CommunityList />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/community/create"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <CreateCommunity />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/community/:slug"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <CommunityDetail user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/community/:slug/manage"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <CommunityManage user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route
                  path="/community/discussion/:id"
                  element={
                    user ? (
                      <Layout user={user} onLogout={handleLogout}>
                        <DiscussionDetail user={user} />
                      </Layout>
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Router>
            </div>
          </div>
        </WebSocketProvider>
      )}
    </ThemeProvider>
  );
}

export default App;
