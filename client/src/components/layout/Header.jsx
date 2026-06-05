import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header__logo">⚽ WC 2026</div>

      <nav className="header__nav">
        <NavLink to="/">Today</NavLink>
        <NavLink to="/week">This Week</NavLink>
        <NavLink to="/overview">Overview</NavLink>
        <NavLink to="/betting">Betting</NavLink>
        <NavLink to="/rules">New Rules</NavLink>
      </nav>

      <div className="header__auth">
        {user ? (
          <>
            <span className="header__username">{user.full_name}</span>
            <button onClick={logout} className="btn btn--outline">Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn--outline">Log in</NavLink>
            <NavLink to="/register" className="btn btn--primary">Sign up</NavLink>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
