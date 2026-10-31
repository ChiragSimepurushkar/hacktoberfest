import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Clock, Settings, Plus } from 'lucide-react';
import '../styles/layout.css';

const NAV_ITEMS = [
  { to: '/',         icon: Home,     label: 'Home',     end: true },
  { to: '/examples', icon: BookOpen, label: 'Examples', end: false },
  { to: '/history',  icon: Clock,    label: 'History',  end: false },
];

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-scroll">
          {children}
        </div>
      </main>
      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}

/* ── Desktop sidebar ── */
function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <Link to="/" className="sidebar-brand" aria-label="Lab Twin — go to home">
        <img
          src="/images/logo.png"
          alt="Lab Twin"
          className="sidebar-logo-full"
        />
        <img
          src="/images/logo.png"
          alt="Lab Twin"
          className="sidebar-logo-icon"
          aria-hidden="true"
        />
      </Link>

      {/* Nav links */}
      <div className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <Icon size={16} aria-hidden="true" />
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
        >
          <Settings size={16} aria-hidden="true" />
          <span className="sidebar-link-label">Settings</span>
        </NavLink>
        <Link to="/new" className="sidebar-new-btn" id="sidebar-new-btn">
          <Plus size={16} aria-hidden="true" />
          <span>New Analysis</span>
        </Link>
      </div>
    </nav>
  );
}

/* ── Mobile bottom tab bar ── */
function MobileTabBar() {
  return (
    <nav className="mobile-tabbar" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `mobile-tab${isActive ? ' active' : ''}`
          }
        >
          <Icon size={20} aria-hidden="true" />
          <span className="mobile-tab-label">{label}</span>
        </NavLink>
      ))}
      <Link to="/new" className="mobile-tab mobile-tab-new" id="mobile-new-btn">
        <div className="mobile-tab-new-icon">
          <Plus size={18} aria-hidden="true" />
        </div>
        <span className="mobile-tab-label">New</span>
      </Link>
    </nav>
  );
}
