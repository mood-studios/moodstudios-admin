import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/bookings', label: 'Bookings', icon: '◷' },
  { to: '/users', label: 'Users', icon: '◎' },
  { to: '/services', label: 'Services', icon: '◇' },
  { to: '/categories', label: 'Categories', icon: '▤' },
  { to: '/gallery', label: 'Gallery', icon: '▣' },
  { to: '/featured-photos', label: 'Featured photos', icon: '◐' },
  { to: '/chat', label: 'Messages', icon: '◈' },
  { to: '/activity-logs', label: 'Activity logs', icon: '◉' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">
            <img src="/mood_logo.png" alt="Mood Studios logo" />
          </span>
          <div>
            <strong>Mood Studios</strong>
            <span>Admin</span>
          </div>
        </div>
        <nav className="sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="sidebar__avatar">{user?.name?.[0] || 'A'}</span>
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
