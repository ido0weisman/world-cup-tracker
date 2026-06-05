import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps any route that requires authentication (currently just /betting).
// While the auth state is loading (token being verified), renders nothing.
// Once resolved: logged-in users pass through; guests are redirected to /login.
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
