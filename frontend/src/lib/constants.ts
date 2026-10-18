import { SessionType } from '../services/types';

export const FACULTY_EMAIL_DOMAIN = 'thapar.edu';

/** Must match QR_TTL_SECONDS in backend/src/attendance/attendance.service.ts. */
export const QR_TTL_SECONDS = 15;

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

/** Same rule the backend applies in AttendanceService.isGoogleFormsUrl. */
export function isGoogleFormsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && (
      (url.hostname === 'docs.google.com' && url.pathname.startsWith('/forms/')) || url.hostname === 'forms.gle'
    );
  } catch {
    return false;
  }
}
