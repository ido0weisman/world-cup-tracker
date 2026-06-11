import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppRouter from './router/AppRouter';
import MobileGate from './components/MobileGate';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MobileGate>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </MobileGate>
  </StrictMode>
);
