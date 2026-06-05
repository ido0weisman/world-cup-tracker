import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// Layout is the persistent shell that wraps every page.
// <Outlet /> is where React Router renders the active page component.
function Layout() {
  return (
    <div className="app-shell">
      {/* Background image + overlay are applied via CSS on .app-shell */}
      <div className="overlay" />

      <Header />

      <main className="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
