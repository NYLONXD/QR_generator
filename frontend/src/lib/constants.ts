import { SessionType } from '../services/types';

export const FACULTY_EMAIL_DOMAIN = 'thapar.edu';

/** Must match QR_TTL_SECONDS in backend/src/attendance/attendance.service.ts. */
export const QR_TTL_SECONDS = 20;

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Instrumentation Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'School of Mathematics',
  'School of Physics & Materials Science',
  'School of Chemistry & Biochemistry',
  'School of Humanities & Social Sciences',
  'LM Thapar School of Management',
  'School of Energy & Environment',
];

export const DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Teaching Associate',
  'Visiting Faculty',
];

export const SESSION_TYPES: SessionType[] = ['Lecture', 'Tutorial', 'Lab'];

export function isFacultyEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${FACULTY_EMAIL_DOMAIN}`);
}

/**
 * Same rule as backend/src/attendance/google-form-url.ts: the link students are sent to, or null if this
 * isn't a Google Form link. Editor links (…/d/<id>/edit) become the form's /viewform page.
 */
export function studentFormUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname === 'forms.gle') {
    const code = url.pathname.match(/^\/([A-Za-z0-9]+)\/?$/);
    return code ? `https://forms.gle/${code[1]}` : null;
  }
  const form = url.hostname === 'docs.google.com' && url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([\w-]{20,})(?:\/|$)/);
  if (!form) return null;
  const student = new URL(`https://docs.google.com/forms/d/${form[1] ?? ''}${form[2]}/viewform`);
  for (const [key, answer] of url.searchParams) if (key.startsWith('entry.')) student.searchParams.append(key, answer);
  return student.toString();
}

export function isGoogleFormsUrl(value: string) {
  return studentFormUrl(value) !== null;
}
