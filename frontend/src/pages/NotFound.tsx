import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThaparMark } from '../components/Brand';

export function NotFound() {
  return (
    <main className="not-found">
      <ThaparMark />
      <h1>404</h1>
      <p className="muted">This page doesn't exist or has moved.</p>
      <Link to="/" className="btn btn-dark"><ArrowLeft size={18} />Back to dashboard</Link>
    </main>
  );
}
