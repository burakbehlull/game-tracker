import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Timer from './pages/Timer';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { api } from './services/api';

import TitleBar from './components/TitleBar';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    checkAuth();
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
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      // Only clear token on explicit 401 Unauthorized, preserve it on network errors (startup)
      if (error.response && error.response.status === 401) {
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

  if (loading) {
    return (<></>);
  }

  return (
    <ThemeProvider>
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
            </Routes>
          </Router>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
