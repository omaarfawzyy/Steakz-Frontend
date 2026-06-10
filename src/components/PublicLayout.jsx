import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const publicNav = [
  { to: '/login', label: 'Login' },
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  const { session } = useApp();

  if (session) {
    return <Navigate to={`/portal/${session.role}`} replace />;
  }

  return (
    <div className="site-shell">
      <div className="backdrop-grid" aria-hidden="true" />
      <header className="site-header">
        <NavLink to="/login" className="brand-mark">
          <span className="brand-mark__crest">S</span>
          <span>
            <strong>Steakz</strong>
            <small>London luxury dining</small>
          </span>
        </NavLink>

        <nav className="site-nav" aria-label="Primary navigation">
          {publicNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-actions">
          <NavLink to="/login" className="button button--primary">
            Sign in
          </NavLink>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>London dining rooms</strong>
          <p>Five Steakz branches across the capital.</p>
        </div>
        <div>
          <strong>Hours</strong>
          <p>Open daily for lunch and dinner.</p>
        </div>
        <div>
          <strong>Contact</strong>
          <p>+44 20 7946 1100</p>
        </div>
      </footer>
    </div>
  );
}
