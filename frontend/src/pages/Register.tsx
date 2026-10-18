import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, UserRound } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, Field, PasswordInput, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, DESIGNATIONS, FACULTY_EMAIL_DOMAIN, isFacultyEmail } from '../lib/constants';
import { errorMessage, RegisterInput } from '../services/api';

type Errors = Partial<Record<keyof RegisterInput | 'confirm', string>>;

function validate(form: RegisterInput, confirm: string): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 3) errors.name = 'Enter your full name.';
  if (!isFacultyEmail(form.email)) errors.email = `Use your official @${FACULTY_EMAIL_DOMAIN} email address.`;
  if (!form.department) errors.department = 'Select your department.';
  if (!form.designation) errors.designation = 'Select your designation.';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (confirm !== form.password) errors.confirm = 'Passwords do not match.';
  return errors;
}

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterInput>({ name: '', email: '', department: '', designation: '', password: '' });
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof RegisterInput) => (event: { target: { value: string } }) => {
    setForm(f => ({ ...f, [key]: event.target.value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form, confirm);
    setErrors(found);
    setError('');
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      // GuestOnly redirects to the dashboard once the teacher is set.
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Please try again.'));
      setLoading(false);
    }
  }

  const invalid = (key: keyof Errors) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });

  return (
    <AuthLayout>
      <h2>Create your faculty account</h2>
      <p className="subtitle">Sign up with your official @{FACULTY_EMAIL_DOMAIN} email and go straight to your dashboard.</p>

      <form className="form" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" htmlFor="name" error={errors.name} hint="Include your title, e.g. Dr. Priya Sharma">
          <div className="input-wrap has-icon">
            <UserRound size={18} />
            <input id="name" className="input" autoComplete="name" value={form.name} onChange={update('name')} disabled={loading} {...invalid('name')} />
          </div>
        </Field>
        <Field label="Official email" htmlFor="email" error={errors.email}>
          <div className="input-wrap has-icon">
            <Mail size={18} />
            <input id="email" className="input" type="email" autoComplete="email" placeholder={`name@${FACULTY_EMAIL_DOMAIN}`}
              value={form.email} onChange={update('email')} disabled={loading} {...invalid('email')} />
          </div>
        </Field>
        <div className="form-row">
          <Field label="Department" htmlFor="department" error={errors.department}>
            <select id="department" className="select" value={form.department} onChange={update('department')} disabled={loading} {...invalid('department')}>
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" htmlFor="designation" error={errors.designation}>
            <select id="designation" className="select" value={form.designation} onChange={update('designation')} disabled={loading} {...invalid('designation')}>
              <option value="">Select…</option>
              {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Password" htmlFor="password" error={errors.password}>
            <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={update('password')} disabled={loading} {...invalid('password')} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
            <PasswordInput id="confirm" autoComplete="new-password" value={confirm}
              onChange={e => { setConfirm(e.target.value); setErrors(er => ({ ...er, confirm: undefined })); }} disabled={loading} {...invalid('confirm')} />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <><Spinner /> Creating account…</> : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}
