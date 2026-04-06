const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace('/api', '');

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

  getAllBadges: async () => {
    return request(`${API_URL}/users/badges/all`);
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
  },

  // Friends
  sendFriendRequest: async ({ targetUserId, username }) => {
    return request(`${API_URL}/friends/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUserId, username })
    });
  },

  getFriendRequests: async () => {
    return request(`${API_URL}/friends/requests`, { headers: getHeaders() });
  },

  acceptFriendRequest: async (requestId) => {
    return request(`${API_URL}/friends/requests/${requestId}/accept`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  rejectFriendRequest: async (requestId) => {
    return request(`${API_URL}/friends/requests/${requestId}/reject`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  getFriends: async () => {
    return request(`${API_URL}/friends/list`, { headers: getHeaders() });
  },

  removeFriend: async (friendId) => {
    return request(`${API_URL}/friends/${friendId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  // Presence
  getFriendsPresence: async () => {
    return request(`${API_URL}/presence/friends`, { headers: getHeaders() });
  },

  updateMyPresence: async ({ isPlaying, currentGame }) => {
    return request(`${API_URL}/presence/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isPlaying, currentGame })
    });
  },

  // Chat
  createConversation: async ({ type, participantIds, title }) => {
    return request(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type, participantIds, title })
    });
  },

  getConversations: async () => {
    return request(`${API_URL}/chat/conversations`, { headers: getHeaders() });
  },

  getConversationMessages: async (conversationId, cursor = null, limit = 30) => {
    const qs = new URLSearchParams();
    if (cursor) qs.set('cursor', cursor);
    if (limit) qs.set('limit', String(limit));
    return request(`${API_URL}/chat/conversations/${conversationId}/messages?${qs.toString()}`, {
      headers: getHeaders()
    });
  },

  sendMessage: async (conversationId, content) => {
    return request(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
  },

  markConversationRead: async (conversationId) => {
    return request(`${API_URL}/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
  }
};
