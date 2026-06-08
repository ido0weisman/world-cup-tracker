import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

function Login() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If we got here because ProtectedRoute bounced a guest away from a page
  // (e.g. /betting), it stashes that page in route state. Send the user
  // back there after a successful login instead of always going home.
  const from = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(form);
      setAuth(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      // err.response is only present when the server actually responded.
      // If it's missing, the request never reached the server — show a
      // clearer message for that case instead of a generic "Login failed."
      if (err.response) {
        setError(err.response.data?.error || 'Login failed. Please try again.');
      } else {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-card__title">⚽ Welcome Back</h1>
        <p className="auth-card__sub">Log in to place your predictions</p>

        {error && <p className="auth-card__error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form__field">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="auth-form__field">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn--primary auth-form__submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="auth-card__switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
