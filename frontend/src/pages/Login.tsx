import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, Mail } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, Field, PasswordInput, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { FACULTY_EMAIL_DOMAIN } from '../lib/constants';
import { errorMessage, USE_MOCK } from '../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@thapar.edu', password: 'admin123' },
  { label: 'Faculty member', email: 'teacher@thapar.edu', password: 'teacher123' },
];

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // GuestOnly redirects once the teacher is set.
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Check your connection and try again.'));
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Faculty sign in</h2>
      <p className="subtitle">Sign in with your official @{FACULTY_EMAIL_DOMAIN} account.</p>

      <form className="form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field label="Email address" htmlFor="email">
          <div className="input-wrap has-icon">
            <Mail size={18} />
            <input id="email" className="input" type="email" autoComplete="username" placeholder={`name@${FACULTY_EMAIL_DOMAIN}`}
              value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} autoFocus />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
        </Field>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <><Spinner /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="auth-switch">New to the portal? <Link to="/register">Request faculty access</Link></p>

      {USE_MOCK && (
        <div className="demo-accounts">
          <p className="demo-accounts-title"><FlaskConical size={15} />Demo accounts</p>
          <div className="demo-accounts-list">
            {DEMO_ACCOUNTS.map(account => (
              <button key={account.email} type="button" className="demo-account" disabled={loading}
                onClick={() => { setEmail(account.email); setPassword(account.password); setError(''); }}>
                <strong>{account.label}</strong>
                <span>{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
