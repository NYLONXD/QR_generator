import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrResponse } from '../services/api';

export function QrPanel({ qr }: { qr: QrResponse | null }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!qr) return;
    QRCode.toDataURL(qr.qrUrl, { width: 280, margin: 2 }).then(setDataUrl);
  }, [qr?.qrUrl]);

  return <section className="qr-panel">
    <div className="qr-box">{dataUrl ? <img src={dataUrl} alt="Temporary attendance gateway QR code" /> : <span>QR CODE</span>}</div>
    <p className="countdown">Expires in: <strong>{qr?.ttlRemaining ?? '—'}</strong> seconds</p>
  </section>;
}
