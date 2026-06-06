import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const INITIAL = { full_name: '', email: '', age: '', gender: '', favorite_team: '', password: '' };

function Register() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const [form,    setForm]    = useState(INITIAL);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Client-side validation mirrors the server rules (fail fast, better UX)
  function validate() {
    if (!form.full_name.trim())               return 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email.';
    if (!form.age || form.age < 1)            return 'Enter a valid age.';
    if (!['male','female'].includes(form.gender)) return 'Select a gender.';
    if (form.password.length < 6 || form.password.length > 12)
      return 'Password must be 6–12 characters.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      const payload = { ...form, age: Number(form.age) };
      const { token, user } = await register(payload);
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">🏆 Join the Game</h1>
        <p className="auth-card__sub">Create your account to start predicting</p>

        {error && <p className="auth-card__error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form auth-form--grid">
          <div className="auth-form__field">
            <label>Full Name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </div>
          <div className="auth-form__field">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="auth-form__field">
            <label>Age</label>
            <input type="number" name="age" value={form.age} onChange={handleChange} min="1" max="120" required />
          </div>
          <div className="auth-form__field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} required>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="auth-form__field">
            <label>Favourite Team <span className="auth-form__optional">(optional)</span></label>
            <input name="favorite_team" value={form.favorite_team} onChange={handleChange} placeholder="e.g. Brazil" />
          </div>
          <div className="auth-form__field">
            <label>Password <span className="auth-form__optional">(6–12 chars)</span></label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>

          <button type="submit" className="btn btn--primary auth-form__submit auth-form__submit--full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-card__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
