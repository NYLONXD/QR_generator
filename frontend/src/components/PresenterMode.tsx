import { useEffect, useRef } from 'react';
import { Camera, CircleCheck, Minimize2, ScanLine } from 'lucide-react';
import { QR_TTL_SECONDS } from '../lib/constants';
import { AttendanceSession, QrResponse } from '../services/api';
import { ThaparLogo } from './Brand';
import { QrDisplay } from './QrPanel';

interface Props {
  session: AttendanceSession | null;
  qr: QrResponse | null;
  progress: number;
  secondsLeft: number;
  offline: boolean;
  onClose(): void;
}

/** Full-screen projector view. Always light, for the best scanning contrast. */
export function PresenterMode({ session, qr, progress, secondsLeft, offline, onClose }: Props) {
  const enteredFullscreen = useRef(false);
  // Held in a ref so a new onClose identity never re-runs the fullscreen effect.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const root = document.documentElement;
    root.requestFullscreen?.().then(() => { enteredFullscreen.current = true; }).catch(() => { /* not allowed: overlay still fills the window */ });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Esc inside native fullscreen only exits fullscreen; treat that as closing presenter mode too.
    const onFullscreenChange = () => { if (!document.fullscreenElement && enteredFullscreen.current) close.current(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current(); };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <div className="presenter" role="dialog" aria-modal="true" aria-label="Attendance QR code, presenter view">
      <div className="presenter-top">
        <ThaparLogo />
        {session && (
          <div className="presenter-course">
            <strong>{session.courseCode} · {session.courseTitle}</strong>
            <span>Group {session.group} · {session.sessionType}</span>
          </div>
        )}
      </div>

      <div className="presenter-body">
        <QrDisplay qr={qr} progress={progress} secondsLeft={secondsLeft} offline={offline} />
        <div className="presenter-side">
          <h2>Scan to mark your attendance</h2>
          <ol className="presenter-steps">
            <li><Camera size={24} />Open your phone's camera</li>
            <li><ScanLine size={24} />Point it at this code</li>
            <li><CircleCheck size={24} />Fill in the form that opens</li>
          </ol>
          <div className="presenter-stats">
            {session && <div><strong>{session.checkIns}</strong><span>Checked in</span></div>}
            <div><strong>{secondsLeft}s</strong><span>New code in</span></div>
          </div>
        </div>
      </div>

      <div className="presenter-bottom">
        <span>The code changes every {QR_TTL_SECONDS} seconds, so screenshots stop working.</span>
        <button type="button" className="btn btn-ghost" onClick={onClose}><Minimize2 size={18} />Exit presenter view (Esc)</button>
      </div>
    </div>
  );
}
