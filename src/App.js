import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
      updateCurrentGame();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [sessionsData, statsData] = await Promise.all([
          window.electronAPI.getGameSessions(),
          window.electronAPI.getGameStats()
        ]);
        setSessions(sessionsData);
        setStats(statsData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const updateCurrentGame = async () => {
    try {
      if (window.electronAPI) {
        const game = await window.electronAPI.getCurrentGame();
        setCurrentGame(game);
      }
    } catch (error) {
      console.error('Mevcut oyun bilgisi hatası:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 dk';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours} sa ${minutes} dk`;
    } else if (minutes > 0) {
      return `${minutes} dk ${secs} sn`;
    } else {
      return `${secs} sn`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎮 Oyun Süre Takip Uygulaması</h1>
          <p className="subtitle">Oyun süre takibi</p>
        </header>

        {currentGame && (
          <div className="current-game">
            <div className="current-game-header">
              <h2>Şu Anda Oynanan</h2>
              <div className="live-indicator">● Canlı</div>
            </div>
            <div className="current-game-content">
              <div className="game-name">{currentGame.gameName}</div>
              <div className="game-time">
                <span className="time-label">Oyun Süresi:</span>
                <span className="time-value">{formatDuration(currentGame.duration)}</span>
              </div>
              <div className="game-start">
                Başlangıç: {formatDate(currentGame.startTime)}
              </div>
            </div>
          </div>
        )}

        <div className="stats-section">
          <h2>📊 İstatistikler</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-game-name">{stat._id}</div>
                <div className="stat-total-time">
                  {formatDuration(stat.totalTime)}
                </div>
                <div className="stat-sessions">
                  {stat.sessionCount} oturum
                </div>
                <div className="stat-last-played">
                  Son oynanma: {formatDate(stat.lastPlayed)}
                </div>
              </div>
            ))}
            {stats.length === 0 && (
              <div className="no-stats">Henüz oyun kaydı yok</div>
            )}
          </div>
        </div>

        <div className="sessions-section">
          <h2>📝 Oyun Oturumları</h2>
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session._id} className="session-card">
                <div className="session-header">
                  <span className="session-game">{session.gameName}</span>
                  <span className="session-duration">
                    {formatDuration(session.duration)}
                  </span>
                </div>
                <div className="session-details">
                  <div>Başlangıç: {formatDate(session.startTime)}</div>
                  <div>Bitiş: {formatDate(session.endTime)}</div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="no-sessions">Henüz oturum kaydı yok</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

