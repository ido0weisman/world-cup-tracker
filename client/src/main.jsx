import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppRouter from './router/AppRouter';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);
