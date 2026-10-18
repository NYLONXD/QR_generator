import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CircleStop, ExternalLink, History, Maximize2, Plus, TriangleAlert, UserCheck } from 'lucide-react';
import { useShell } from '../components/AppLayout';
import { PresenterMode } from '../components/PresenterMode';
import { QrDisplay, useQrCountdown } from '../components/QrPanel';
import { Modal, PageHeader, SessionStatusBadge, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { formatDuration, formatElapsed, formatTime } from '../lib/format';
import { api, ApiError, AttendanceSession, errorMessage, QrResponse } from '../services/api';

const QR_POLL_MS = 1500;
const SESSION_POLL_MS = 4000;

function EndedSummary({ session }: { session: AttendanceSession | null }) {
  return (
    <section className="card" style={{ maxWidth: 640 }}>
      <div className="card-body" style={{ display: 'grid', gap: 20, justifyItems: 'start' }}>
        <span className="badge badge-ended">Session ended</span>
        <div>
          <h2 style={{ fontSize: 24 }}>{session ? `${session.courseCode} · ${session.courseTitle}` : 'This session has ended'}</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            {session ? <>Group {session.group} · {session.sessionType} · {formatTime(session.createdAt)}{session.stoppedAt && ` to ${formatTime(session.stoppedAt)}`}</> : 'The QR code no longer works.'}
          </p>
        </div>
        {session && (
          <div className="qr-meta" style={{ justifyContent: 'flex-start' }}>
            <div className="qr-meta-item" style={{ textAlign: 'left' }}><strong>{session.checkIns}</strong><span>Check-ins</span></div>
            <span className="qr-meta-divider" />
            <div className="qr-meta-item" style={{ textAlign: 'left' }}><strong>{formatDuration(session.createdAt, session.stoppedAt)}</strong><span>QR open for</span></div>
          </div>
        )}
        <p className="muted">Responses are in your Google Form. Open it to see who checked in.</p>
        <div className="page-actions">
          {session && <a href={session.googleFormUrl} target="_blank" rel="noreferrer" className="btn"><ExternalLink size={17} />Open Google Form</a>}
          <Link to="/sessions" className="btn"><History size={17} />Session history</Link>
          <Link to="/sessions/new" className="btn btn-primary"><Plus size={17} />Start another session</Link>
        </div>
      </div>
    </section>
  );
}

export function LiveSession() {
  const { sessionId = '' } = useParams();
  const toast = useToast();
  const { refreshShell } = useShell();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const [ended, setEnded] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bump, setBump] = useState(false);
  const lastCount = useRef<number | null>(null);
  const { secondsLeft, progress } = useQrCountdown(ended ? null : qr);

  // Session details (course, check-in count). Optional: the QR keeps working without them.
  // Polled while live; loaded once more after it ends for the final count.
  useEffect(() => {
    let cancelled = false;
    const load = () => api.session(sessionId).then(next => {
      if (cancelled) return;
      setSession(next);
      if (next.status !== 'active') setEnded(true);
    }).catch(() => {});
    load();
    const timer = ended ? undefined : window.setInterval(load, SESSION_POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sessionId, ended]);

  useEffect(() => {
    if (ended) return;
    let cancelled = false;
    const load = async () => {
      try {
        const next = await api.qr(sessionId);
        if (cancelled) return;
        setQr(next);
        setOffline(false);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setEnded(true);
        else setOffline(true);
      }
    };
    load();
    const timer = window.setInterval(load, QR_POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sessionId, ended]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Pulse the counter when new students check in.
  useEffect(() => {
    if (!session) return;
    if (lastCount.current !== null && session.checkIns > lastCount.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 450);
      lastCount.current = session.checkIns;
      return () => window.clearTimeout(timer);
    }
    lastCount.current = session.checkIns;
  }, [session?.checkIns]);

  const closePresenter = useCallback(() => setPresenting(false), []);

  async function endSession() {
    setStopping(true);
    try {
      await api.stop(sessionId);
      setEnded(true);
      setConfirmOpen(false);
      setPresenting(false);
      refreshShell();
      toast({ tone: 'success', title: 'Session ended', description: 'The QR code no longer works.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Could not end the session', description: errorMessage(error, 'Please try again.') });
    } finally {
      setStopping(false);
    }
  }

  const title = session ? `${session.courseCode} · ${session.courseTitle}` : 'Attendance session';

  if (ended) return (
    <>
      <Link to="/" className="back-link"><ArrowLeft size={16} />Dashboard</Link>
      <PageHeader title="Session summary" />
      <EndedSummary session={session} />
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow={<SessionStatusBadge status="active" />}
        title={title}
        subtitle={session && `Group ${session.group} · ${session.sessionType} · started at ${formatTime(session.createdAt)}`}
        actions={<>
          <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmOpen(true)}><CircleStop size={18} />End session</button>
          <button type="button" className="btn btn-dark" onClick={() => setPresenting(true)}><Maximize2 size={18} />Presenter view</button>
        </>}
      />

      <div className="live-grid">
        <section className="card qr-card" aria-label="Live attendance QR code">
          <QrDisplay qr={qr} progress={progress} secondsLeft={secondsLeft} offline={offline} />
          <div className="qr-meta">
            <div className="qr-meta-item"><strong>{qr ? `${secondsLeft}s` : '…'}</strong><span>Next code in</span></div>
            <span className="qr-meta-divider" />
            <div className="qr-meta-item"><strong>{session ? formatElapsed(now - new Date(session.createdAt).getTime()) : '…'}</strong><span>Time open</span></div>
          </div>
        </section>

        <div className="stack">
          {session && (
            <section className="card checkin-counter" aria-live="polite">
              <span className="checkin-counter-icon"><UserCheck size={26} /></span>
              <div>
                <strong className={bump ? 'bump' : undefined} style={{ display: 'inline-block' }}>{session.checkIns}</strong>
                <span style={{ display: 'block' }}>students checked in so far</span>
              </div>
            </section>
          )}

          {session && (
            <section className="card">
              <div className="card-header"><h2 className="card-title">Session details</h2></div>
              <div className="card-body">
                <dl className="detail-list">
                  <dt>Course</dt><dd>{session.courseCode}</dd>
                  <dt>Title</dt><dd>{session.courseTitle}</dd>
                  <dt>Group</dt><dd>{session.group}</dd>
                  <dt>Type</dt><dd>{session.sessionType}</dd>
                  <dt>Started</dt><dd>{formatTime(session.createdAt)}</dd>
                  <dt>Form</dt>
                  <dd><a href={session.googleFormUrl} target="_blank" rel="noreferrer">Open form <ExternalLink size={13} style={{ verticalAlign: '-1px' }} /></a></dd>
                </dl>
              </div>
            </section>
          )}

          <div className="note">
            <TriangleAlert size={18} style={{ color: 'var(--warning)' }} />
            <span>Keep this page open while students scan. The code refreshes by itself, and closing the page doesn't end the session.</span>
          </div>
        </div>
      </div>

      {presenting && (
        <PresenterMode session={session} qr={qr} progress={progress} secondsLeft={secondsLeft} offline={offline} onClose={closePresenter} />
      )}

      <Modal
        open={confirmOpen}
        onClose={() => !stopping && setConfirmOpen(false)}
        icon={<span className="modal-icon danger"><CircleStop size={22} /></span>}
        title="End this session?"
        description={<>The QR code stops working straight away and students can no longer check in.{session && <> {session.checkIns} students have checked in.</>}</>}
        footer={<>
          <button type="button" className="btn" onClick={() => setConfirmOpen(false)} disabled={stopping}>Keep it running</button>
          <button type="button" className="btn btn-danger" onClick={endSession} disabled={stopping}>
            {stopping ? <><Spinner /> Ending…</> : 'End session'}
          </button>
        </>}
      />
    </>
  );
}
