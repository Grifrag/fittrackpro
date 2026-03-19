import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Change this to your deployed backend URL in production
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api-production-cead.up.railway.app/api';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Foods ───────────────────────────────────────────────────────────────────
export const foodsAPI = {
  search: (q, source = 'all') => api.get('/foods/search', { params: { q, source } }),
  barcode: (code) => api.get(`/foods/barcode/${code}`),
  addCustom: (data) => api.post('/foods', data),
  greekFoods: () => api.get('/foods/greek'),
};

// ── Meals ───────────────────────────────────────────────────────────────────
export const mealsAPI = {
  getDay: (date) => api.get(`/meals/${date}`),
  log: (data) => api.post('/meals', data),
  deleteItem: (itemId) => api.delete(`/meals/items/${itemId}`),
  logWater: (amount_ml, date) => api.post('/meals/water', { amount_ml, date }),
};

// ── Progress ────────────────────────────────────────────────────────────────
export const progressAPI = {
  log: (data) => api.post('/progress', data),
  history: (days = 90) => api.get('/progress', { params: { days } }),
  weekly: () => api.get('/progress/weekly'),
  logWorkout: (data) => api.post('/progress/workout', data),
  getWorkouts: (limit = 20) => api.get('/progress/workouts', { params: { limit } }),
  adjustments: () => api.get('/progress/adjustments'),
};

// ── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  calculateGoals: () => api.get('/users/calculate-goals'),
};

// ── Payments ──────────────────────────────────────────────────────────────
export const paymentsAPI = {
  createCheckout: () => api.post('/payments/create-checkout'),
};

// ── Recipes ───────────────────────────────────────────────────────────────
export const recipesAPI = {
  list: () => api.get('/recipes'),
  get: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  delete: (id) => api.delete(`/recipes/${id}`),
};

export default api;
