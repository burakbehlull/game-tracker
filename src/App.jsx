import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import { api } from './services/api';

import TitleBar from './components/TitleBar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (localStorage.getItem('token')) {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
        // If in Electron, restore token
        if (window.electronAPI) {
          await window.electronAPI.setAuthToken(localStorage.getItem('token'));
        }
      }
    } catch (error) {
      console.error('Auth kontrol hatası:', error);
      localStorage.removeItem('token');
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
        <TitleBar />
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
                  user ? (
                    <Layout user={user} onLogout={handleLogout}>
                      <Home user={user} />
                    </Layout>
                  ) : (
                    <Home user={null} />
                  )
                }
              />
              <Route
                path="/discover"
                element={
                  user ? (
                    <Layout user={user} onLogout={handleLogout}>
                      <Discover />
                    </Layout>
                  ) : (
                    <Navigate to="/login" />
                  )
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
            </Routes>
          </Router>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
