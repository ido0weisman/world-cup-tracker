import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps any route that requires authentication (currently just /betting).
// While the auth state is loading (token being verified), renders nothing.
// Once resolved: logged-in users pass through; guests are redirected to /login.
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  // Carry the page the guest was trying to reach in route state, so Login
  // can send them back here after a successful sign-in instead of dumping
  // them on the home page (e.g. /betting -> login -> back to /betting).
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

export default ProtectedRoute;
