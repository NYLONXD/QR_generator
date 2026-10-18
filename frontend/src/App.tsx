import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Dashboard } from './pages/Dashboard';
import { Faculty } from './pages/Faculty';
import { LiveSession } from './pages/LiveSession';
import { Login } from './pages/Login';
import { NewSession } from './pages/NewSession';
import { NotFound } from './pages/NotFound';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';
import { Sessions } from './pages/Sessions';

function RequireAuth({ children }: { children: ReactNode }) {
  const { teacher } = useAuth();
  const location = useLocation();
  if (!teacher) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { teacher } = useAuth();
  return teacher?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />;
}

/** Login/register pages; once signed in, go back to wherever RequireAuth bounced the user from. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { teacher } = useAuth();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  return teacher ? <Navigate to={from} replace /> : <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="sessions/new" element={<NewSession />} />
              <Route path="sessions/:sessionId/live" element={<LiveSession />} />
              <Route path="faculty" element={<RequireAdmin><Faculty /></RequireAdmin>} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
