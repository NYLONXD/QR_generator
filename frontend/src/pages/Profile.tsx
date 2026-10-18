import { FormEvent, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { Alert, Avatar, Field, PageHeader, PasswordInput, Spinner } from '../components/ui';
import { useAuth, useTeacher } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEPARTMENTS, DESIGNATIONS } from '../lib/constants';
import { formatDate } from '../lib/format';
import { api, errorMessage, ProfileInput } from '../services/api';

function PersonalInfo() {
  const teacher = useTeacher();
  const { setTeacher } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<ProfileInput>({ name: teacher.name, department: teacher.department ?? '', designation: teacher.designation ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = form.name !== teacher.name || form.department !== (teacher.department ?? '') || form.designation !== (teacher.designation ?? '');

  const set = (key: keyof ProfileInput) => (event: { target: { value: string } }) => setForm(f => ({ ...f, [key]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3) return setError('Enter your full name.');
    setError('');
    setSaving(true);
    try {
      setTeacher(await api.updateProfile({ ...form, name: form.name.trim() }));
      toast({ tone: 'success', title: 'Profile updated' });
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={teacher.name} large />
          <div>
            <h2 className="card-title">{teacher.name}</h2>
            <p className="card-subtitle">
              {teacher.role === 'admin' ? 'Administrator' : 'Faculty'}
              {teacher.createdAt && <> · member since {formatDate(teacher.createdAt)}</>}
            </p>
          </div>
        </div>
      </div>
      <div className="card-body form">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" htmlFor="p-name"><input id="p-name" className="input" value={form.name} onChange={set('name')} disabled={saving} autoComplete="name" /></Field>
        <Field label="Email" htmlFor="p-email" hint="Your sign-in email can't be changed. Ask an administrator if it's wrong.">
          <div className="input-wrap has-icon">
            <Mail size={18} />
            <input id="p-email" className="input" value={teacher.email} disabled readOnly />
          </div>
        </Field>
        <div className="form-row">
          <Field label="Department" htmlFor="p-dept">
            <select id="p-dept" className="select" value={form.department} onChange={set('department')} disabled={saving}>
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" htmlFor="p-desig">
            <select id="p-desig" className="select" value={form.designation} onChange={set('designation')} disabled={saving}>
              <option value="">Select…</option>
              {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn btn-dark" disabled={saving || !dirty}>{saving ? <><Spinner /> Saving…</> : 'Save changes'}</button>
      </div>
    </form>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next.length < 8) return setError('Your new password needs at least 8 characters.');
    if (next !== confirm) return setError('The new passwords do not match.');
    if (next === current) return setError('Choose a password different from your current one.');
    setError('');
    setSaving(true);
    try {
      await api.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      toast({ tone: 'success', title: 'Password changed', description: 'Use your new password the next time you sign in.' });
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card-header">
        <div>
          <h2 className="card-title"><KeyRound size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />Change password</h2>
          <p className="card-subtitle">Use at least 8 characters</p>
        </div>
      </div>
      <div className="card-body form">
        {error && <Alert>{error}</Alert>}
        <Field label="Current password" htmlFor="pw-current"><PasswordInput id="pw-current" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} disabled={saving} /></Field>
        <Field label="New password" htmlFor="pw-new"><PasswordInput id="pw-new" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} disabled={saving} /></Field>
        <Field label="Confirm new password" htmlFor="pw-confirm"><PasswordInput id="pw-confirm" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={saving} /></Field>
      </div>
      <div className="card-footer">
        <button type="submit" className="btn btn-dark" disabled={saving || !current || !next || !confirm}>{saving ? <><Spinner /> Updating…</> : 'Update password'}</button>
      </div>
    </form>
  );
}

export function Profile() {
  return (
    <>
      <PageHeader title="My profile" subtitle="Your details appear on your dashboard and, for administrators, in the faculty list." />
      <div className="split">
        <PersonalInfo />
        <ChangePassword />
      </div>
    </>
  );
}
