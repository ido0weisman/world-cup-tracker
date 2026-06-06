import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const NAV_LINKS = [
  { to: '/today',    label: 'Today',     end: false },
  { to: '/week',     label: 'This Week', end: false },
  { to: '/overview', label: 'Overview',  end: false },
  { to: '/betting',  label: 'Betting',   end: false },
  { to: '/rules',    label: 'New Rules', end: false },
];

function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <NavLink to="/" className="header__logo" onClick={closeMenu}>
        ⚽ FIFA WORLD CUP 2026
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
            <span className="header__username">👤 {user.full_name.split(' ')[0]}</span>
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
            <button onClick={() => { logout(); closeMenu(); }} className="btn btn--outline mobile-menu__btn">
              Log out
            </button>
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
