import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { COUNTRIES } from '../../utils/countries';
import './Auth.css';

const INITIAL = {
  full_name: '', email: '', age: '', gender: '',
  country: '', favorite_team: '', password: '',
};

function Register() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const { data: groupsData } = useFetch(getAllGroups);
  const allTeams = (groupsData?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name));

  const [form,    setForm]    = useState(INITIAL);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email.';
    if (!form.age || form.age < 1) return 'Enter a valid age.';
    if (!['male', 'female'].includes(form.gender)) return 'Select a gender.';
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
      // err.response is only present when the server actually responded
      // (e.g. 409 "account already exists"). If it's missing, the request
      // never reached the server — show a clearer message for that case
      // instead of the generic "Registration failed."
      if (err.response) {
        setError(err.response.data?.error || 'Registration failed. Please try again.');
      } else {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
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

          {/* Country of origin — used to confirm timezone-aware times */}
          <div className="auth-form__field">
            <label>Country</label>
            <select name="country" value={form.country} onChange={handleChange}>
              <option value="">Select your country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Favourite team — dropdown from the API */}
          <div className="auth-form__field">
            <label>Favourite Team <span className="auth-form__optional">(optional)</span></label>
            <select name="favorite_team" value={form.favorite_team} onChange={handleChange}>
              <option value="">None / Neutral</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.name}>{team.name}</option>
              ))}
            </select>
          </div>

          <div className="auth-form__field auth-form__field--full">
            <label>Password <span className="auth-form__optional">(6–12 chars)</span></label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>

          <button
            type="submit"
            className="btn btn--primary auth-form__submit auth-form__submit--full"
            disabled={loading}
          >
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
