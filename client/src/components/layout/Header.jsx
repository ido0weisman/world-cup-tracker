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
  { to: '/betting',         label: 'Predictions',  end: false },
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
      {/* Logo + social icons grouped in the brand area */}
      <div className="header__brand">
        <NavLink to="/" className="header__logo" onClick={closeMenu}>
          🏆 WC TRACKER
        </NavLink>
        <div className="header__socials">
          <a
            href="https://www.linkedin.com/in/ido-weisman/"
            target="_blank"
            rel="noreferrer"
            className="header__social-link"
            title="LinkedIn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a
            href="https://github.com/ido0weisman"
            target="_blank"
            rel="noreferrer"
            className="header__social-link"
            title="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
          </a>
        </div>
      </div>

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
