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
// A 401 from a protected endpoint means the stored token expired or is
// invalid — clear it and bounce to the login page.
//
// The login/register endpoints ALSO answer with 401/409 for things like
// "Invalid email or password" — those aren't session problems, they're the
// page's own form-validation errors and the component already renders them.
// Without this check, the global redirect below fires first, hard-navigates
// to /login (wiping React state) and the user never sees "Invalid email or
// password" — it looks like the login page just silently reloads.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('wc2026_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
