import { ReactNode, useEffect, useId, useRef, useState, InputHTMLAttributes } from 'react';
import { CircleAlert, Eye, EyeOff, LucideIcon, TrendingDown, TrendingUp, X } from 'lucide-react';
import { initials } from '../lib/format';
import { SessionStatus, TeacherStatus } from '../services/types';

export function Spinner({ large = false, label }: { large?: boolean; label?: string }) {
  return <span className={`spinner${large ? ' spinner-lg' : ''}`} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading-block"><Spinner large /><span>{label}</span></div>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`avatar${large ? ' avatar-lg' : ''}`} aria-hidden="true">{initials(name)}</span>;
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return status === 'active'
    ? <span className="badge badge-live"><span className="live-dot" />Live</span>
    : <span className="badge badge-ended">Ended</span>;
}

const FACULTY_STATUS_LABEL: Record<TeacherStatus, string> = { active: 'Active', pending: 'Pending approval', disabled: 'Disabled' };
export function FacultyStatusBadge({ status }: { status: TeacherStatus }) {
  return <span className={`badge badge-${status}`}>{FACULTY_STATUS_LABEL[status]}</span>;
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success' | 'warning'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><CircleAlert size={18} aria-hidden="true" /><div>{children}</div></div>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function StatTile({ label, value, icon: Icon, change, changeLabel, foot }: {
  label: string; value: ReactNode; icon: LucideIcon; change?: number | null; changeLabel?: string; foot?: ReactNode;
}) {
  const direction = change == null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" aria-hidden="true"><Icon size={18} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        {direction && (
          <span className={`delta delta-${direction}`}>
            {direction === 'up' && <TrendingUp size={14} aria-hidden="true" />}
            {direction === 'down' && <TrendingDown size={14} aria-hidden="true" />}
            {change! > 0 ? '+' : ''}{change}%
          </span>
        )}
        {direction && changeLabel && <span>{changeLabel}</span>}
        {foot}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, optional, children, htmlFor }: {
  label: string; hint?: ReactNode; error?: string; optional?: boolean; children: ReactNode; htmlFor: string;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>{label}{optional && <span className="optional"> (optional)</span>}</label>
      {children}
      {error ? <p className="field-error" id={`${htmlFor}-error`}><CircleAlert size={14} aria-hidden="true" />{error}</p>
        : hint && <p className="field-hint" id={`${htmlFor}-hint`}>{hint}</p>}
    </div>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap has-action">
      <input {...props} type={visible ? 'text' : 'password'} className="input" />
      <button type="button" className="input-action" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/** Native <dialog> gives us focus trapping, Esc-to-close and a backdrop for free. */
export function Modal({ open, onClose, title, description, icon, children, footer }: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; icon?: ReactNode; children?: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === ref.current) onClose(); }}
    >
      {open && (
        <>
          <div className="modal-header">
            <div>
              {icon}
              <h2 className="modal-title" id={titleId}>{title}</h2>
              {description && <p className="modal-description">{description}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
          {children && <div className="modal-body">{children}</div>}
          {footer && <div className="modal-footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
