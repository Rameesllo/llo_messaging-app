import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: `${API_URL}/api`
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

API.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    console.warn('Unauthorized request detected. Redirecting to login...');
    localStorage.removeItem('token');
    window.location.href = '/login'; 
  }
  return Promise.reject(error);
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me')
};

export const userAPI = {
  getProfile: (id) => API.get(`/users/profile/${id}`),
  getFriends: () => API.get('/users/friends'),
  getMutualFriends: (id) => API.get(`/users/mutual/${id}`),
  updateProfile: (data) => API.put('/users/profile', data)
};

export const friendAPI = {
  search: (query) => API.get(`/friends/search?query=${query}`),
  sendRequest: (receiverId) => API.post('/friends/request', { receiverId }),
  acceptRequest: (requestId) => API.post('/friends/accept', { requestId }),
  getPending: () => API.get('/friends/pending'),
  discover: () => API.get('/friends/discover'),
  unfriend: (userId) => API.delete(`/friends/unfriend/${userId}`)
};

export const messageAPI = {
  getConversations: () => API.get('/messages/conversations'),
  getMessages: (otherUserId) => API.get(`/messages/${otherUserId}`),
  sendMessage: (data) => API.post('/messages/send', data),
  markAsRead: (otherUserId) => API.put(`/messages/read/${otherUserId}`),
  markViewed: (messageId) => API.put(`/messages/viewed/${messageId}`),
  toggleReaction: (messageId, emoji) => API.post(`/messages/react/${messageId}`, { emoji }),
  deleteMessage: (messageId, type) => API.delete(`/messages/delete/${messageId}`, { data: { type } }),
  cleanupMessages: (otherUserId) => API.delete(`/messages/cleanup/${otherUserId}`),
  deleteAll: (chatId) => API.delete(`/messages/all/${chatId}`)
};

export const groupAPI = {
  create: (data) => API.post('/groups/create', data),
  getAll: () => API.get('/groups/all'),
  addMember: (data) => API.post('/groups/add-member', data),
  leaveGroup: (groupId) => API.post(`/groups/leave/${groupId}`),
  deleteGroup: (groupId) => API.delete(`/groups/${groupId}`)
};

export const mediaAPI = {
  upload: (data) => API.post('/media/upload', data)
};

export const aiAPI = {
  generate: (prompt) => API.post('/ai/generate', { prompt })
};

// Debug helper
if (typeof window !== 'undefined') {
  window.friendAPI = friendAPI;
}

export default API;
