import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, WifiOff } from 'lucide-react';
import { QR_TTL_SECONDS } from '../lib/constants';
import { QrResponse } from '../services/api';
import { Spinner } from './ui';

/**
 * Smooth countdown for the current QR token. The server's TTL is whole seconds and
 * arrives every poll, so we only re-anchor the deadline when the token changes or
 * the drift is noticeable; otherwise the ring would jitter back and forth.
 */
export function useQrCountdown(qr: QrResponse | null) {
  const deadline = useRef(0);
  const token = useRef('');
  const [now, setNow] = useState(Date.now());

  if (qr) {
    const next = Date.now() + qr.ttlRemaining * 1000;
    if (qr.token !== token.current || Math.abs(next - deadline.current) > 1500) {
      token.current = qr.token;
      deadline.current = next;
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = qr ? Math.max(0, deadline.current - now) : 0;
  return { secondsLeft: Math.ceil(remaining / 1000), progress: Math.min(1, remaining / (QR_TTL_SECONDS * 1000)) };
}

/** Countdown border traced around the code; pathLength=100 lets the offset be a plain percentage. */
function CountdownBorder({ progress, low }: { progress: number; low: boolean }) {
  const shape = { x: 1.5, y: 1.5, width: 97, height: 97, rx: 9, pathLength: 100 };
  return (
    <svg className="qr-ring" viewBox="0 0 100 100" aria-hidden="true">
      <rect className="track" {...shape} />
      <rect className={`progress${low ? ' low' : ''}`} {...shape} strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />
    </svg>
  );
}

export function QrDisplay({ qr, progress, secondsLeft, offline }: {
  qr: QrResponse | null; progress: number; secondsLeft: number; offline?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!qr) return;
    let cancelled = false;
    // High error correction leaves room for the logo in the centre.
    QRCode.toDataURL(qr.qrUrl, { width: 720, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#221f20', light: '#ffffff' } })
      .then(url => { if (!cancelled) setDataUrl(url); });
    return () => { cancelled = true; };
  }, [qr?.qrUrl]);

  return (
    <div className="qr-stage">
      <CountdownBorder progress={progress} low={secondsLeft <= 4} />
      <div className="qr-frame">
        {dataUrl && qr ? (
          <>
            <img key={qr.token} src={dataUrl} alt="Attendance QR code. Scan with your phone camera." />
            <span className="qr-logo" aria-hidden="true"><img src="/brand/thapar-mark.png" alt="" /></span>
          </>
        ) : (
          <div className="qr-placeholder"><Spinner large /><span>Generating secure code…</span></div>
        )}
        {offline && (
          <div className="qr-expired" role="alert">
            <WifiOff size={28} />
            <strong>Connection lost</strong>
            <span>Reconnecting… The code is hidden so nobody scans an expired one.</span>
          </div>
        )}
        {!offline && qr && secondsLeft === 0 && (
          <div className="qr-expired" aria-live="polite">
            <RefreshCw size={26} className="spin-slow" />
            <span>Refreshing code…</span>
          </div>
        )}
      </div>
    </div>
  );
}
