import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminInbox } from '../context/AdminInboxContext';
import { useAdminConfirm } from '../hooks/useAdminConfirm';

const nav = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/bookings', label: 'Bookings', icon: '◷' },
  { to: '/calendar', label: 'Calendar', icon: '▦' },
  { to: '/users', label: 'Users', icon: '◎' },
  { to: '/archived-users', label: 'Archived', icon: '◌' },
  { to: '/services', label: 'Services', icon: '◇' },
  { to: '/categories', label: 'Categories', icon: '▤' },
  { to: '/gallery', label: 'Gallery', icon: '▣' },
  { to: '/featured-photos', label: 'Featured photos', icon: '◐' },
  { to: '/chat', label: 'Messages', icon: '◈' },
  { to: '/activity-logs', label: 'Activity logs', icon: '◉' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { conversationCount } = useAdminInbox();
  const { confirmLogout } = useAdminConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await confirmLogout('Are you sure you want to sign out of the admin panel?');
    if (!ok) return;
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
              <span className="sidebar__link-label">{item.label}</span>
              {item.to === '/chat' && conversationCount > 0 ? (
                <span className="sidebar__badge" aria-label={`${conversationCount} unread conversations`}>
                  {conversationCount > 99 ? '99+' : conversationCount}
                </span>
              ) : null}
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
          <NavLink to="/settings" className="btn btn--ghost btn--sm sidebar__settings-link">
            Settings
          </NavLink>
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
