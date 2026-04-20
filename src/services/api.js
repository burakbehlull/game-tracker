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

  verifyEmail: async (userId, code) => {
    return request(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code })
    });
  },

  forgotPassword: async (email) => {
    return request(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (token, newPassword) => {
    return request(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
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

  getGlobalStats: async () => {
    return request(`${API_URL}/stats/global`);
  },

  getTopGamesByPeriod: async (period) => {
    return request(`${API_URL}/stats/top-games/${period}`);
  },

  getActiveUsersByPeriod: async (period) => {
    return request(`${API_URL}/stats/active-users/${period}`);
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
  getConversations: async () => {
    return request(`${API_URL}/chat/conversations`, { headers: getHeaders() });
  },

  getMessages: async (conversationId) => {
    return request(`${API_URL}/chat/messages/${conversationId}`, { headers: getHeaders() });
  },

  sendMessage: async (conversationId, text) => {
    return request(`${API_URL}/chat/messages/${conversationId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
  },

  getOrCreateConversation: async (participantId) => {
    return request(`${API_URL}/chat/conversations/${participantId}`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  // Community
  getCommunities: async () => {
    return request(`${API_URL}/community`, { headers: getHeaders() });
  },

  getCommunityBySlug: async (slug) => {
    return request(`${API_URL}/community/${slug}`, { headers: getHeaders() });
  },

  createCommunity: async (data) => {
    return request(`${API_URL}/community/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  joinCommunity: async (slug) => {
    return request(`${API_URL}/community/${slug}/join`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  leaveCommunity: async (slug) => {
    return request(`${API_URL}/community/${slug}/leave`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  getCommunityFeed: async () => {
    return request(`${API_URL}/community/feed`, { headers: getHeaders() });
  },

  getUserCommunities: async (userId) => {
    return request(`${API_URL}/community/user/${userId}`, { headers: getHeaders() });
  },

  getDiscussions: async (communityId) => {
    return request(`${API_URL}/community/discussions/list?communityId=${communityId}`, { headers: getHeaders() });
  },

  getDiscussionById: async (id) => {
    return request(`${API_URL}/community/discussions/${id}`, { headers: getHeaders() });
  },

  createDiscussion: async (data) => {
    return request(`${API_URL}/community/discussions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  getComments: async (discussionId) => {
    return request(`${API_URL}/community/discussions/${discussionId}/comments`, { headers: getHeaders() });
  },

  createComment: async (discussionId, content) => {
    return request(`${API_URL}/community/discussions/${discussionId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
  },

  updateCommunitySettings: async (slug, settings) => {
    return request(`${API_URL}/community/${slug}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
  },

  getPendingMembers: async (slug) => {
    return request(`${API_URL}/community/${slug}/pending-members`, { headers: getHeaders() });
  },

  approveMember: async (slug, userId) => {
    return request(`${API_URL}/community/${slug}/approve-member`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId })
    });
  },

  // Notifications
  getNotifications: async () => {
    return request(`${API_URL}/notifications`, { headers: getHeaders() });
  },

  markNotificationRead: async (id) => {
    return request(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
  },

  markAllNotificationsRead: async () => {
    return request(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders()
    });
  },

  getEvents: async (communityId) => {
    return request(`${API_URL}/community/events/list?communityId=${communityId}`, { headers: getHeaders() });
  },

  createEvent: async (data) => {
    return request(`${API_URL}/community/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  deleteEvent: async (id) => {
    return request(`${API_URL}/community/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  getPendingDiscussions: async (communityId) => {
    return request(`${API_URL}/community/discussions/pending?communityId=${communityId}`, { headers: getHeaders() });
  },

  approveDiscussion: async (discussionId) => {
    return request(`${API_URL}/community/discussions/${discussionId}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  deleteDiscussion: async (discussionId) => {
    return request(`${API_URL}/community/discussions/${discussionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  deleteCommunity: async (slug) => {
    return request(`${API_URL}/community/${slug}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  }
};
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

  deleteMessage: async (conversationId, messageId) => {
    return request(`${API_URL}/chat/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  markConversationRead: async (conversationId) => {
    return request(`${API_URL}/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  // Admin
  adminLogin: async (username, password) => {
    return request(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },

  getAdminStats: async () => {
    const token = localStorage.getItem('adminToken');
    return request(`${API_URL}/admin/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getAdminUsers: async (page = 1, limit = 20, search = '') => {
    const token = localStorage.getItem('adminToken');
    return request(`${API_URL}/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  updateUserRole: async (userId, role) => {
    const token = localStorage.getItem('adminToken');
    return request(`${API_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });
  },

  deleteUser: async (userId) => {
    const token = localStorage.getItem('adminToken');
    return request(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
};
