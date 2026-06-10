import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getMyScore } from '../../api/bets.api';
import './Header.css';

// Resolves to `null` for guests so we never call an auth-only endpoint
// without a logged-in user.
const fetchNothing = () => Promise.resolve(null);

const NAV_LINKS = [
  { to: '/today',           label: 'Today',        end: false },
  { to: '/week',            label: 'Schedule',     end: false },
  { to: '/overview',        label: 'Overview',     end: false },
  { to: '/betting',         label: 'Betting',      end: false },
  { to: '/betting/oracle',  label: '🔮 Oracle',    end: false },
  { to: '/rules',           label: 'New Rules',    end: false },
];

function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Logged-in users see their live prediction score; guests skip the call entirely.
  const { data: scoreData } = useFetch(user ? getMyScore : fetchNothing, [user?.id]);
  const points = scoreData?.score?.total_points ?? 0;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <NavLink to="/" className="header__logo" onClick={closeMenu}>
        🏆 WC TRACKER
      </NavLink>

      {/* Desktop navigation */}
      <nav className="header__nav">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `header__link ${isActive ? 'header__link--active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Desktop auth */}
      <div className="header__auth">
        {user ? (
          <>
            <span className="header__points" title="Your total prediction points">🏅 {points} pts</span>
            <NavLink to="/profile" className="header__username">👤 {user.full_name.split(' ')[0]}</NavLink>
            <button onClick={logout} className="btn btn--outline">Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login"    className="btn btn--outline">Log in</NavLink>
            <NavLink to="/register" className="btn btn--primary">Sign up</NavLink>
          </>
        )}
      </div>

      {/* Hamburger (mobile only) */}
      <button
        className={`hamburger ${menuOpen ? 'hamburger--open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={closeMenu}
              className={({ isActive }) => `mobile-menu__link ${isActive ? 'mobile-menu__link--active' : ''}`}>
              {label}
            </NavLink>
          ))}
          <div className="mobile-menu__divider" />
          {user ? (
            <>
              <span className="header__points header__points--mobile" title="Your total prediction points">🏅 {points} pts</span>
              <NavLink to="/profile" onClick={closeMenu} className="mobile-menu__link">
                👤 {user.full_name.split(' ')[0]}
              </NavLink>
              <button onClick={() => { logout(); closeMenu(); }} className="btn btn--outline mobile-menu__btn">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login"    onClick={closeMenu} className="btn btn--outline mobile-menu__btn">Log in</NavLink>
              <NavLink to="/register" onClick={closeMenu} className="btn btn--primary mobile-menu__btn">Sign up</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
