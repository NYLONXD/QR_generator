import { ReactNode } from 'react';
import { Fingerprint, ShieldCheck, Smartphone, Timer } from 'lucide-react';
import { ThaparLogo } from './Brand';

/** Decorative QR-style motif for the brand panel (not a scannable code). */
function QrMotif() {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx=".6" fill="currentColor" />
    </g>
  );
  const modules: [number, number][] = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    if (!inFinder && ((x * 7 + y * 13 + x * y) % 5 === 0 || (x + y * 3) % 7 === 0)) modules.push([x, y]);
  }
  return (
    <svg className="auth-pattern" viewBox="-0.5 -0.5 22 22" aria-hidden="true">
      {finder(0, 0)}{finder(14, 0)}{finder(0, 14)}
      {modules.map(([x, y]) => <rect key={`${x}:${y}`} x={x + 0.1} y={y + 0.1} width=".8" height=".8" rx=".2" fill="currentColor" />)}
    </svg>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <ThaparLogo tone="white" />
        <div className="auth-aside-body">
          <p className="auth-eyebrow"><Fingerprint size={16} />Faculty Attendance Portal</p>
          <h1>Take attendance in seconds, <em>not roll calls.</em></h1>
          <p className="lead">Project a live QR code in class. Students scan it with their phone and go straight to your Google Form, with no app to install.</p>
          <ul className="auth-features">
            <li>
              <span className="feature-icon"><Timer size={19} /></span>
              <div><strong>Rotates every 15 seconds</strong><span>Each QR code expires quickly, so a screenshot shared on WhatsApp stops working within seconds.</span></div>
            </li>
            <li>
              <span className="feature-icon"><ShieldCheck size={19} /></span>
              <div><strong>Your form link stays private</strong><span>The QR code holds a short-lived gateway token. Students never see the Google Form URL.</span></div>
            </li>
            <li>
              <span className="feature-icon"><Smartphone size={19} /></span>
              <div><strong>Works on any phone</strong><span>Students scan with their phone's camera, and the form opens in the browser.</span></div>
            </li>
          </ul>
        </div>
        <p className="auth-aside-footer">Thapar Institute of Engineering &amp; Technology · Patiala, Punjab</p>
        <QrMotif />
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <ThaparLogo className="mobile-logo" />
          {children}
        </div>
      </main>
    </div>
  );
}
