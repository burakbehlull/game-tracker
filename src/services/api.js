const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  register: async (data) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_URL}/users/me`, { headers: getHeaders() });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getStats: async () => {
    const res = await fetch(`${API_URL}/games/stats`, { headers: getHeaders() });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getSessions: async () => {
    const res = await fetch(`${API_URL}/games/history`, { headers: getHeaders() });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  searchUsers: async (query) => {
    const res = await fetch(`${API_URL}/users/search?q=${query}`, { headers: getHeaders() });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  getUserProfile: async (username) => {
    const res = await fetch(`${API_URL}/users/profile/${username}`, { headers: getHeaders() });
    if (!res.ok) throw await res.json();
    return res.json();
  }
};
