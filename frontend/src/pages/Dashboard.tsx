import { FormEvent, useEffect, useState } from 'react';
import { QrPanel } from '../components/QrPanel';
import { api, clearToken, getToken, QrResponse, setToken } from '../services/api';

function Spinner() {
  return (
    <span className="btn-spinner" aria-hidden="true" />
  );
}

export function Dashboard() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const result = await api.login(email, password);
      setToken(result.accessToken);
      setLoggedIn(true);
    } catch {
      setError('Login failed. Check your credentials and try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStartLoading(true);
    try {
      const result = await api.start(googleFormUrl);
      setSessionId(result.sessionId);
    } catch {
      setError('Enter a valid Google Forms URL.');
    } finally {
      setStartLoading(false);
    }
  }

  async function stop() {
    if (!sessionId) return;
    setStopLoading(true);
    try {
      await api.stop(sessionId);
      setSessionId('');
      setQr(null);
    } finally {
      setStopLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const next = await api.qr(sessionId);
        if (!cancelled) setQr(next);
      } catch {
        if (!cancelled) setError('Unable to refresh QR.');
      }
    };
    load();
    const timer = window.setInterval(load, 1500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sessionId]);

  if (!loggedIn) return (
    <main className="shell">
      <form className="card" onSubmit={login}>
        <h1>Teacher Login</h1>
        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required disabled={loginLoading} />
        </label>
        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required disabled={loginLoading} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loginLoading} className={loginLoading ? 'btn-loading' : ''}>
          {loginLoading ? <><Spinner /> Logging in…</> : 'Login'}
        </button>
      </form>
    </main>
  );

  return (
    <main className="shell">
      <section className="card">
        <div className="top">
          <h1>Attendance Gateway</h1>
          <button className="link" onClick={() => { clearToken(); setLoggedIn(false); }}>Logout</button>
        </div>

        {!sessionId ? (
          <form onSubmit={start}>
            <label>
              Google Form URL
              <input
                value={googleFormUrl}
                onChange={e => setGoogleFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/..."
                required
                disabled={startLoading}
              />
            </label>
            <button type="submit" disabled={startLoading} className={startLoading ? 'btn-loading' : ''}>
              {startLoading ? <><Spinner /> Starting…</> : 'Start Attendance'}
            </button>
          </form>
        ) : (
          <>
            <QrPanel qr={qr} />
            <button
              className={`danger${stopLoading ? ' btn-loading' : ''}`}
              onClick={stop}
              disabled={stopLoading}
            >
              {stopLoading ? <><Spinner /> Stopping…</> : 'Stop Attendance'}
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

