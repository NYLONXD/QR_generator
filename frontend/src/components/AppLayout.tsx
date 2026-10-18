import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { History, LayoutDashboard, LogOut, Menu, QrCode, Radio, UserRound, Users, X } from 'lucide-react';
import { useAuth, useTeacher } from '../context/AuthContext';
import { api, AttendanceSession, USE_MOCK } from '../services/api';
import { ThaparLogo } from './Brand';
import { Avatar } from './ui';

interface ShellValue {
  activeSession: AttendanceSession | null;
  /** Re-checks the live session / pending approvals shown in the sidebar. */
  refreshShell(): void;
}

const ShellContext = createContext<ShellValue>({ activeSession: null, refreshShell: () => {} });
export const useShell = () => useContext(ShellContext);

export function AppLayout() {
  const teacher = useTeacher();
  const { logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [pendingFaculty, setPendingFaculty] = useState(0);
  const [version, setVersion] = useState(0);
  const isAdmin = teacher.role === 'admin';

  const refreshShell = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    // Both endpoints are optional for the shell: if the backend lacks them, the sidebar just shows less.
    api.sessions()
      .then(list => { if (!cancelled) setActiveSession(list.find(s => s.status === 'active') ?? null); })
      .catch(() => {});
    if (isAdmin) {
      api.faculty()
        .then(list => { if (!cancelled) setPendingFaculty(list.filter(t => t.status === 'pending').length); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [isAdmin, version, location.pathname]);

  return (
    <ShellContext.Provider value={{ activeSession, refreshShell }}>
      <div className={`app${navOpen ? ' nav-open' : ''}`}>
        <aside className="sidebar" id="sidebar" aria-label="Main navigation">
          <div className="sidebar-brand">
            <ThaparLogo tone="white" />
            <div className="sidebar-product">
              <span>Attendance Portal</span>
              {USE_MOCK && <span className="badge badge-demo" title="Running on sample data stored in this browser (npm run dev:mock)">Demo</span>}
            </div>
          </div>

          <nav className="nav">
            <NavLink to="/" end className="nav-link"><LayoutDashboard size={19} />Dashboard</NavLink>
            {activeSession && (
              <NavLink to={`/sessions/${activeSession.id}/live`} className="nav-link">
                <Radio size={19} />Live session
                <span className="nav-live"><span className="live-dot" />Live</span>
              </NavLink>
            )}
            <NavLink to="/sessions/new" end className="nav-link"><QrCode size={19} />Start session</NavLink>
            <NavLink to="/sessions" end className="nav-link"><History size={19} />Session history</NavLink>

            {isAdmin && (
              <>
                <p className="nav-section">Administration</p>
                <NavLink to="/faculty" className="nav-link">
                  <Users size={19} />Faculty
                  {pendingFaculty > 0 && <span className="nav-count" aria-label={`${pendingFaculty} awaiting approval`}>{pendingFaculty}</span>}
                </NavLink>
              </>
            )}

            <p className="nav-section">Account</p>
            <NavLink to="/profile" className="nav-link"><UserRound size={19} />My profile</NavLink>
          </nav>

          <div className="sidebar-user">
            <Avatar name={teacher.name} />
            <div className="sidebar-user-text">
              <strong>{teacher.name}</strong>
              <span>{teacher.role === 'admin' ? 'Administrator' : teacher.designation ?? teacher.email}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

        <div className="main">
          <header className="topbar">
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setNavOpen(open => !open)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              aria-controls="sidebar"
            >
              {navOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <ThaparLogo tone="white" />
            <span style={{ width: 40 }} aria-hidden="true" />
          </header>
          <main className="page" id="content">
            <Outlet />
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
