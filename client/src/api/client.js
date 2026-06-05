import axios from 'axios';

// Single axios instance used by every API call in the app.
// Centralizing it here means we only configure the base URL and auth header once.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Attach the JWT on every outgoing request if one exists in storage.
// This interceptor runs automatically — individual API functions don't need to think about auth.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('wc2026_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error interceptor.
// A 401 means the token expired or is invalid — clear it and redirect to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wc2026_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
