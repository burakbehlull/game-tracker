const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  let body = null;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = new Error(body?.error || body?.message || 'Request failed');
    error.status = res.status;
    error.data = body;
    throw error;
  }

  return body;
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  login: async (username, password) => {
    return request(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },
  
  register: async (data) => {
    return request(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  getCurrentUser: async () => {
    return request(`${API_URL}/users/me`, { headers: getHeaders() });
  },

  updateProfile: async (data) => {
    return request(`${API_URL}/users/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  getStats: async () => {
    return request(`${API_URL}/games/stats`, { headers: getHeaders() });
  },

  getSessions: async () => {
    return request(`${API_URL}/games/history`, { headers: getHeaders() });
  },
  
  searchUsers: async (query) => {
    return request(`${API_URL}/users/search?q=${query}`, { headers: getHeaders() });
  },

  getChallenges: async () => {
    return request(`${API_URL}/users/challenges`, { headers: getHeaders() });
  },

  getUserProfile: async (username) => {
    return request(`${API_URL}/users/profile/${username}`, { headers: getHeaders() });
  },
  
  getGameDetails: async (gameName) => {
    return request(`${API_URL}/games/details/${encodeURIComponent(gameName)}`, { headers: getHeaders() });
  },

  // Library
  addToLibrary: async (gameName, exePath = '') => {
    return request(`${API_URL}/users/library/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ gameName, exePath })
    });
  },

  updateLibraryExe: async (gameName, exePath) => {
    return request(`${API_URL}/users/library/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ gameName, exePath })
    });
  },

  removeFromLibrary: async (gameName) => {
    return request(`${API_URL}/users/library/${encodeURIComponent(gameName)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  }
};
