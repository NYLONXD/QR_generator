import { FormEvent, useMemo, useState } from 'react';
import { Ban, Check, CircleCheck, Copy, Search, SearchX, UserPlus, Users } from 'lucide-react';
import { useShell } from '../components/AppLayout';
import { Alert, Avatar, EmptyState, FacultyStatusBadge, Field, LoadingBlock, Modal, PageHeader, Spinner } from '../components/ui';
import { useTeacher } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLoader } from '../hooks/useLoader';
import { DEPARTMENTS, DESIGNATIONS, FACULTY_EMAIL_DOMAIN, isFacultyEmail } from '../lib/constants';
import { formatRelative } from '../lib/format';
import { api, errorMessage, NewFacultyInput, Teacher, TeacherStatus } from '../services/api';

type Tab = 'all' | TeacherStatus;
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'disabled', label: 'Disabled' },
];
const STATUS_ORDER: Record<TeacherStatus, number> = { pending: 0, active: 1, disabled: 2 };

const EMPTY_FORM: NewFacultyInput = { name: '', email: '', department: '', designation: '', role: 'teacher' };

function AddFacultyModal({ open, onClose, onCreated }: { open: boolean; onClose(): void; onCreated(teacher: Teacher): void }) {
  const toast = useToast();
  const [form, setForm] = useState<NewFacultyInput>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ teacher: Teacher; temporaryPassword: string } | null>(null);

  const set = (key: keyof NewFacultyInput) => (event: { target: { value: string } }) => setForm(f => ({ ...f, [key]: event.target.value }));

  function close() {
    if (saving) return;
    onClose();
    setForm(EMPTY_FORM);
    setError('');
    setCreated(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3) return setError('Enter the full name.');
    if (!isFacultyEmail(form.email)) return setError(`Use an official @${FACULTY_EMAIL_DOMAIN} email address.`);
    if (!form.department || !form.designation) return setError('Select a department and designation.');
    setError('');
    setSaving(true);
    try {
      const result = await api.addFaculty({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      setCreated(result);
      onCreated(result.teacher);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      toast({ tone: 'success', title: 'Password copied' });
    } catch {
      toast({ tone: 'error', title: 'Copy failed', description: 'Select the password and copy it manually.' });
    }
  }

  if (created) return (
    <Modal open={open} onClose={close} title="Account created"
      icon={<span className="modal-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><CircleCheck size={22} /></span>}
      description={<><strong>{created.teacher.name}</strong> can now sign in as {created.teacher.email}.</>}
      footer={<button type="button" className="btn btn-dark" onClick={close}>Done</button>}>
      <div className="field">
        <span className="field-label">Temporary password</span>
        <div className="secret">
          <span>{created.temporaryPassword}</span>
          <button type="button" className="btn btn-sm" onClick={copyPassword}><Copy size={15} />Copy</button>
        </div>
        <p className="field-hint">Share it with them privately. They can change it from My profile after signing in. It won't be shown again.</p>
      </div>
    </Modal>
  );

  return (
    <Modal open={open} onClose={close} title="Add faculty member" description="Create an active account directly, without waiting for a sign-up request."
      footer={<>
        <button type="button" className="btn" onClick={close} disabled={saving}>Cancel</button>
        <button type="submit" form="add-faculty" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Creating…</> : 'Create account'}</button>
      </>}>
      <form id="add-faculty" className="form" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" htmlFor="f-name"><input id="f-name" className="input" placeholder="e.g. Dr. Priya Sharma" value={form.name} onChange={set('name')} disabled={saving} autoFocus /></Field>
        <Field label="Official email" htmlFor="f-email"><input id="f-email" className="input" type="email" placeholder={`name@${FACULTY_EMAIL_DOMAIN}`} value={form.email} onChange={set('email')} disabled={saving} /></Field>
        <div className="form-row">
          <Field label="Department" htmlFor="f-dept">
            <select id="f-dept" className="select" value={form.department} onChange={set('department')} disabled={saving}>
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" htmlFor="f-desig">
            <select id="f-desig" className="select" value={form.designation} onChange={set('designation')} disabled={saving}>
              <option value="">Select…</option>
              {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 6 }}>Role</legend>
          <div className="choice-group">
            <label className="choice"><input type="radio" name="role" checked={form.role === 'teacher'} onChange={() => setForm(f => ({ ...f, role: 'teacher' }))} disabled={saving} />Faculty</label>
            <label className="choice"><input type="radio" name="role" checked={form.role === 'admin'} onChange={() => setForm(f => ({ ...f, role: 'admin' }))} disabled={saving} />Administrator</label>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function Faculty() {
  const me = useTeacher();
  const toast = useToast();
  const { refreshShell } = useShell();
  const { data: faculty, error, setData } = useLoader(() => api.faculty());
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<Teacher | null>(null);

  const counts = useMemo<Record<Tab, number>>(() => {
    const list = faculty ?? [];
    const count = (status: TeacherStatus) => list.filter(t => t.status === status).length;
    return { all: list.length, pending: count('pending'), active: count('active'), disabled: count('disabled') };
  }, [faculty]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (faculty ?? [])
      .filter(t => (tab === 'all' || t.status === tab) && (!q || `${t.name} ${t.email} ${t.department ?? ''}`.toLowerCase().includes(q)))
      .sort((a, b) => STATUS_ORDER[a.status ?? 'active'] - STATUS_ORDER[b.status ?? 'active'] || a.name.localeCompare(b.name));
  }, [faculty, tab, query]);

  function replace(updated: Teacher) {
    if (faculty) setData(faculty.map(t => (t.id === updated.id ? updated : t)));
    refreshShell();
  }

  async function changeStatus(teacher: Teacher, status: TeacherStatus, message: string) {
    setBusyId(teacher.id);
    try {
      replace(await api.setFacultyStatus(teacher.id, status));
      toast({ tone: 'success', title: message });
      setConfirmDisable(null);
    } catch (err) {
      toast({ tone: 'error', title: 'Could not update the account', description: errorMessage(err, 'Please try again.') });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Faculty"
        subtitle="Approve sign-up requests and manage who can run attendance sessions on the portal."
        actions={<button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus size={18} />Add faculty</button>}
      />

      {error && !faculty ? (
        <Alert tone="warning">The faculty list could not be loaded. This needs the <code>/admin/faculty</code> endpoints on the backend.</Alert>
      ) : !faculty ? (
        <div className="card"><LoadingBlock label="Loading faculty…" /></div>
      ) : (
        <>
          {counts.pending > 0 && tab !== 'pending' && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="warning">
                {counts.pending} sign-up request{counts.pending === 1 ? ' is' : 's are'} waiting for approval.{' '}
                <button type="button" className="link-button" onClick={() => setTab('pending')}>Review requests</button>
              </Alert>
            </div>
          )}

          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Filter by status">
              {TABS.map(t => (
                <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                  {t.label} <span className="count">{counts[t.id]}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-spacer" />
            <div className="input-wrap has-icon">
              <Search size={18} />
              <input className="input" type="search" placeholder="Search name, email or department" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search faculty" />
            </div>
          </div>

          <section className="card">
            {visible.length === 0 ? (
              <EmptyState icon={query ? SearchX : Users} title={query ? 'No one matches that search' : 'Nobody here'}
                description={tab === 'pending' && !query ? 'No sign-up requests are waiting for approval.' : 'Try a different search or filter.'} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faculty member</th>
                      <th>Department</th>
                      <th className="num">Sessions</th>
                      <th>Last session</th>
                      <th>Status</th>
                      <th className="actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(t => {
                      const busy = busyId === t.id;
                      const isMe = t.id === me.id;
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="person">
                              <Avatar name={t.name} />
                              <div style={{ minWidth: 0 }}>
                                <div className="cell-primary">
                                  {t.name}
                                  {t.role === 'admin' && <span className="badge badge-admin">Admin</span>}
                                  {isMe && <span className="badge badge-ended">You</span>}
                                </div>
                                <div className="cell-secondary">{t.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{t.department ?? '—'}</div>
                            <div className="cell-secondary">{t.designation}</div>
                          </td>
                          <td className="num">{t.sessionCount ?? 0}</td>
                          <td className="cell-secondary">{t.status === 'pending' ? `Requested ${formatRelative(t.createdAt)}` : formatRelative(t.lastActiveAt)}</td>
                          <td><FacultyStatusBadge status={t.status ?? 'active'} /></td>
                          <td className="actions">
                            {isMe ? null : t.status === 'pending' ? (
                              <>
                                <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => changeStatus(t, 'disabled', `Declined ${t.name}'s request`)}>Decline</button>
                                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => changeStatus(t, 'active', `${t.name} can now sign in`)}>
                                  {busy ? <Spinner /> : <Check size={15} />}Approve
                                </button>
                              </>
                            ) : t.status === 'disabled' ? (
                              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => changeStatus(t, 'active', `${t.name} has been re-enabled`)}>
                                {busy && <Spinner />}Enable
                              </button>
                            ) : (
                              <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setConfirmDisable(t)}><Ban size={15} />Disable</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <AddFacultyModal open={adding} onClose={() => setAdding(false)} onCreated={teacher => { if (faculty) setData([...faculty, teacher]); }} />

      <Modal
        open={confirmDisable !== null}
        onClose={() => busyId === null && setConfirmDisable(null)}
        icon={<span className="modal-icon danger"><Ban size={22} /></span>}
        title={`Disable ${confirmDisable?.name ?? ''}?`}
        description="They won't be able to sign in or start attendance sessions. Their past sessions are kept, and you can enable the account again at any time."
        footer={<>
          <button type="button" className="btn" onClick={() => setConfirmDisable(null)} disabled={busyId !== null}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={busyId !== null}
            onClick={() => confirmDisable && changeStatus(confirmDisable, 'disabled', `${confirmDisable.name} has been disabled`)}>
            {busyId !== null ? <><Spinner /> Disabling…</> : 'Disable account'}
          </button>
        </>}
      />
    </>
  );
}
