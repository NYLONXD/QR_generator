import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, History, Link2, Lock } from 'lucide-react';
import { useShell } from '../components/AppLayout';
import { Alert, Field, PageHeader, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useLoader } from '../hooks/useLoader';
import { isGoogleFormsUrl, QR_TTL_SECONDS, SESSION_TYPES } from '../lib/constants';
import { api, AttendanceSession, errorMessage, StartSessionInput } from '../services/api';

type Errors = Partial<Record<keyof StartSessionInput, string>>;

const EMPTY: StartSessionInput = { courseCode: '', courseTitle: '', group: '', sessionType: 'Lecture', googleFormUrl: '' };

function validate(form: StartSessionInput): Errors {
  const errors: Errors = {};
  if (!/^[A-Z]{2,5}\d{2,4}[A-Z]?$/.test(form.courseCode.trim())) errors.courseCode = 'Use the course code format, e.g. UCS503.';
  if (form.courseTitle.trim().length < 3) errors.courseTitle = 'Enter the course title.';
  if (!form.group.trim()) errors.group = 'Enter the class group or section.';
  if (!isGoogleFormsUrl(form.googleFormUrl)) errors.googleFormUrl = 'Paste a Google Forms link starting with https://docs.google.com/forms/ or https://forms.gle/';
  return errors;
}

/** Distinct course + group + type combinations from history, newest first, for one-click refill. */
function recentCourses(sessions: AttendanceSession[]) {
  const seen = new Map<string, AttendanceSession>();
  for (const s of sessions) {
    const key = `${s.courseCode}|${s.group}|${s.sessionType}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()].slice(0, 6);
}

export function NewSession() {
  const navigate = useNavigate();
  const toast = useToast();
  const { activeSession, refreshShell } = useShell();
  const { data: sessions } = useLoader(() => api.sessions().catch(() => [] as AttendanceSession[]));
  const recents = useMemo(() => recentCourses(sessions ?? []), [sessions]);
  const [form, setForm] = useState<StartSessionInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof StartSessionInput>(key: K, value: StartSessionInput[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  function prefill(s: AttendanceSession) {
    setForm({ courseCode: s.courseCode, courseTitle: s.courseTitle, group: s.group, sessionType: s.sessionType, googleFormUrl: s.googleFormUrl });
    setErrors({});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setError('');
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const { sessionId } = await api.start({
        ...form,
        courseCode: form.courseCode.trim(),
        courseTitle: form.courseTitle.trim(),
        group: form.group.trim().toUpperCase(),
        googleFormUrl: form.googleFormUrl.trim(),
      });
      refreshShell();
      toast({ tone: 'success', title: 'Session started', description: 'Show the QR code to your class.' });
      navigate(`/sessions/${sessionId}/live`);
    } catch (err) {
      setError(errorMessage(err, 'Could not start the session. Please try again.'));
      setLoading(false);
    }
  }

  const invalid = (key: keyof StartSessionInput) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });

  return (
    <>
      <PageHeader title="Start attendance" subtitle="Tell us which class this is and link your Google Form. You'll get a rotating QR code to show on the projector." />

      {activeSession && (
        <div style={{ marginBottom: 20 }}>
          <Alert tone="info">
            <strong>{activeSession.courseCode} ({activeSession.group})</strong> is still live.{' '}
            <Link to={`/sessions/${activeSession.id}/live`}>Go to that session</Link> to end it, or start another one below.
          </Alert>
        </div>
      )}

      <div className="split">
        <form className="card" onSubmit={submit} noValidate>
          <div className="card-header">
            <div>
              <h2 className="card-title">Session details</h2>
              <p className="card-subtitle">Shown on the projector and saved in your history</p>
            </div>
          </div>
          <div className="card-body form">
            {error && <Alert>{error}</Alert>}

            {recents.length > 0 && (
              <div className="field">
                <span className="field-label"><History size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Use a recent class</span>
                <div className="course-picks">
                  {recents.map(s => (
                    <button key={s.id} type="button" className="course-pick" onClick={() => prefill(s)} disabled={loading}>
                      <code>{s.courseCode}</code>{s.group} · {s.sessionType}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-row">
              <Field label="Course code" htmlFor="courseCode" error={errors.courseCode}>
                <input id="courseCode" className="input" placeholder="e.g. UCS503" value={form.courseCode} disabled={loading}
                  onChange={e => set('courseCode', e.target.value.toUpperCase().replace(/\s+/g, ''))} autoComplete="off" {...invalid('courseCode')} />
              </Field>
              <Field label="Class group" htmlFor="group" error={errors.group}>
                <input id="group" className="input" placeholder="e.g. 3C11" value={form.group} disabled={loading}
                  onChange={e => set('group', e.target.value)} autoComplete="off" {...invalid('group')} />
              </Field>
            </div>

            <Field label="Course title" htmlFor="courseTitle" error={errors.courseTitle}>
              <div className="input-wrap has-icon">
                <BookOpen size={18} />
                <input id="courseTitle" className="input" placeholder="e.g. Software Engineering" value={form.courseTitle} disabled={loading}
                  onChange={e => set('courseTitle', e.target.value)} {...invalid('courseTitle')} />
              </div>
            </Field>

            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label" style={{ marginBottom: 6 }}>Session type</legend>
              <div className="choice-group">
                {SESSION_TYPES.map(type => (
                  <label key={type} className="choice">
                    <input type="radio" name="sessionType" value={type} checked={form.sessionType === type} onChange={() => set('sessionType', type)} disabled={loading} />
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Google Form link" htmlFor="googleFormUrl" error={errors.googleFormUrl}
              hint="Students never see this link. It's stored on the server and opened only after a valid scan.">
              <div className="input-wrap has-icon">
                <Link2 size={18} />
                <input id="googleFormUrl" className="input input-mono" type="url" inputMode="url" placeholder="https://docs.google.com/forms/d/e/…/viewform"
                  value={form.googleFormUrl} disabled={loading} onChange={e => set('googleFormUrl', e.target.value)} {...invalid('googleFormUrl')} />
              </div>
            </Field>
          </div>
          <div className="card-footer">
            <Link to="/" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><Spinner /> Starting…</> : <>Start session <ArrowRight size={18} /></>}
            </button>
          </div>
        </form>

        <aside className="stack">
          <section className="card">
            <div className="card-header"><h2 className="card-title">How it works</h2></div>
            <div className="card-body">
              <ol className="steps">
                <li><div><strong>Start the session</strong><span>Your Google Form link is saved on the server, and never put in the QR code.</span></div></li>
                <li><div><strong>Show the rotating QR code</strong><span>A new code appears every {QR_TTL_SECONDS} seconds. Use presenter view on the classroom projector.</span></div></li>
                <li><div><strong>Students scan and check in</strong><span>Each scan is checked on the server before the form opens on the student's phone.</span></div></li>
                <li><div><strong>End the session</strong><span>Once you end it, the code stops working at once. Responses stay in your Google Form.</span></div></li>
              </ol>
            </div>
          </section>
          <div className="note">
            <Lock size={18} />
            <span>A screenshot of the code stops working within {QR_TTL_SECONDS} seconds. A link forwarded inside that window can still be opened, so keep the code on screen only while students are in the room.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
