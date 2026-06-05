import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

// AuthContext is the single source of truth for the logged-in user across the app.
// Any component can read `user` or call `login`/`logout` without prop drilling.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we verify the stored token

  // On mount: if a token exists in storage, validate it with the server.
  // This keeps the user logged in across page refreshes.
  useEffect(() => {
    const token = localStorage.getItem('wc2026_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiClient.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('wc2026_token'))
      .finally(() => setIsLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('wc2026_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('wc2026_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — cleaner than importing useContext + AuthContext in every component
export function useAuth() {
  return useContext(AuthContext);
}
