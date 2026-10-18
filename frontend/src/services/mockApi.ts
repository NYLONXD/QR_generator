// In-browser stand-in for the NestJS API, enabled by `npm run dev:mock` (or VITE_USE_MOCK=true).
// Lets the redesigned frontend be demoed before the planned backend endpoints exist.
// Data is kept in localStorage; clear the `tiet_attendance_mock_db` key to reseed.
import { isGoogleFormsUrl, QR_TTL_SECONDS } from '../lib/constants';
import { getToken } from './token';
import { Api, ApiError, AttendanceSession, SessionType, Teacher } from './types';

interface MockTeacher extends Teacher { password: string }
interface MockDb { version: number; teachers: MockTeacher[]; sessions: AttendanceSession[] }

const DB_KEY = 'tiet_attendance_mock_db';
const DB_VERSION = 2;
const HISTORY_DAYS = 75; // covers the dashboard's 30-day window plus the 30 days it compares against
const DAY = 86_400_000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function pseudoToken(seed: string) {
  const rand = mulberry32(hash(seed));
  return Array.from({ length: 43 }, () => B64URL[Math.floor(rand() * 64)]).join('');
}

const formUrl = (seed: string) => `https://docs.google.com/forms/d/e/1FAIpQLS${pseudoToken(seed).slice(0, 30)}/viewform`;

interface CourseSeed { code: string; title: string; group: string; type: SessionType; size: number }

function seed(): MockDb {
  const rand = mulberry32(20261018);
  const now = Date.now();
  const teachers: MockTeacher[] = [
    { id: 't-admin', email: 'admin@thapar.edu', password: 'admin123', name: 'Dr. Meera Kapoor', role: 'admin', department: 'Computer Science & Engineering', designation: 'Professor', status: 'active', createdAt: new Date(now - 400 * DAY).toISOString() },
    { id: 't-teacher', email: 'teacher@thapar.edu', password: 'teacher123', name: 'Dr. Arjun Malhotra', role: 'teacher', department: 'Computer Science & Engineering', designation: 'Assistant Professor', status: 'active', createdAt: new Date(now - 200 * DAY).toISOString() },
    { id: 't-kavita', email: 'kavita.sood@thapar.edu', password: 'demo1234', name: 'Dr. Kavita Sood', role: 'teacher', department: 'Electronics & Communication Engineering', designation: 'Associate Professor', status: 'active', createdAt: new Date(now - 180 * DAY).toISOString() },
    { id: 't-rohan', email: 'rohan.bedi@thapar.edu', password: 'demo1234', name: 'Prof. Rohan Bedi', role: 'teacher', department: 'Mechanical Engineering', designation: 'Professor', status: 'active', createdAt: new Date(now - 150 * DAY).toISOString() },
    { id: 't-ishita', email: 'ishita.walia@thapar.edu', password: 'demo1234', name: 'Dr. Ishita Walia', role: 'teacher', department: 'School of Mathematics', designation: 'Assistant Professor', status: 'active', createdAt: new Date(now - 90 * DAY).toISOString() },
    { id: 't-simran', email: 'simran.gill@thapar.edu', password: 'demo1234', name: 'Dr. Simran Gill', role: 'teacher', department: 'Biotechnology', designation: 'Assistant Professor', status: 'pending', createdAt: new Date(now - 2 * DAY).toISOString() },
    { id: 't-nikhil', email: 'nikhil.arora@thapar.edu', password: 'demo1234', name: 'Mr. Nikhil Arora', role: 'teacher', department: 'Civil Engineering', designation: 'Lecturer', status: 'pending', createdAt: new Date(now - 0.5 * DAY).toISOString() },
    { id: 't-vikram', email: 'vikram.sethi@thapar.edu', password: 'demo1234', name: 'Dr. Vikram Sethi', role: 'teacher', department: 'Chemical Engineering', designation: 'Associate Professor', status: 'disabled', createdAt: new Date(now - 300 * DAY).toISOString() },
  ];

  const courses: Record<string, CourseSeed[]> = {
    't-teacher': [
      { code: 'UCS503', title: 'Software Engineering', group: '3C11', type: 'Lecture', size: 64 },
      { code: 'UCS503', title: 'Software Engineering', group: '3C12', type: 'Lecture', size: 61 },
      { code: 'UCS411', title: 'Artificial Intelligence', group: '3C14', type: 'Lecture', size: 58 },
      { code: 'UCS310', title: 'Database Management Systems', group: '2C21', type: 'Lab', size: 26 },
      { code: 'UCS411', title: 'Artificial Intelligence', group: '3C14', type: 'Tutorial', size: 30 },
    ],
    't-admin': [
      { code: 'UCS701', title: 'Theory of Computation', group: '4C31', type: 'Lecture', size: 66 },
      { code: 'UCS802', title: 'Compiler Construction', group: '4C32', type: 'Lecture', size: 59 },
    ],
    't-kavita': [{ code: 'UEC404', title: 'Signals & Systems', group: '2E11', type: 'Lecture', size: 70 }],
    't-rohan': [{ code: 'UME301', title: 'Thermodynamics', group: '2M13', type: 'Lecture', size: 55 }],
    't-ishita': [{ code: 'UMA003', title: 'Mathematics I', group: '1A42', type: 'Tutorial', size: 32 }],
  };

  const sessions: AttendanceSession[] = [];
  for (const [teacherId, list] of Object.entries(courses)) {
    for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
      const day = new Date(now - daysAgo * DAY);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      for (const course of list) {
        if (rand() > (teacherId === 't-teacher' ? 0.42 : 0.3)) continue;
        const start = new Date(day);
        start.setHours(8 + Math.floor(rand() * 9), 2 + Math.floor(rand() * 8), 0, 0);
        const minutesOpen = 4 + Math.floor(rand() * 9);
        sessions.push({
          id: `s-${pseudoToken(`${teacherId}${daysAgo}${course.group}${course.type}`).slice(0, 12)}`,
          teacherId,
          courseCode: course.code,
          courseTitle: course.title,
          group: course.group,
          sessionType: course.type,
          googleFormUrl: formUrl(course.code + course.group),
          status: 'stopped',
          createdAt: start.toISOString(),
          stoppedAt: new Date(start.getTime() + minutesOpen * 60_000).toISOString(),
          checkIns: Math.round(course.size * (0.72 + rand() * 0.26)),
        });
      }
    }
  }
  return { version: DB_VERSION, teachers, sessions };
}

function load(): MockDb {
  try {
    const db = JSON.parse(localStorage.getItem(DB_KEY) ?? 'null') as MockDb | null;
    if (db?.version === DB_VERSION) return db;
  } catch { /* corrupted: reseed */ }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(db: MockDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const delay = (ms = 250 + Math.random() * 350) => new Promise(resolve => setTimeout(resolve, ms));

function toPublic({ password: _password, ...teacher }: MockTeacher): Teacher {
  return teacher;
}

function base64url(text: string) {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function issueToken(teacher: MockTeacher) {
  const payload = { sub: teacher.id, email: teacher.email, name: teacher.name, role: teacher.role };
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(payload))}.mock`;
}

function currentTeacher(db: MockDb): MockTeacher {
  try {
    const { sub } = JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const teacher = db.teachers.find(t => t.id === sub);
    if (teacher && teacher.status === 'active') return teacher;
  } catch { /* fall through */ }
  throw new ApiError('Unauthorized', 401);
}

function requireAdmin(db: MockDb) {
  const teacher = currentTeacher(db);
  if (teacher.role !== 'admin') throw new ApiError('Only administrators can manage faculty.', 403);
  return teacher;
}

function ownedSession(db: MockDb, sessionId: string) {
  const teacher = currentTeacher(db);
  const session = db.sessions.find(s => s.id === sessionId && s.teacherId === teacher.id);
  if (!session) throw new ApiError('Attendance session not found', 404);
  return session;
}

function withFacultyStats(db: MockDb, teacher: MockTeacher): Teacher {
  const own = db.sessions.filter(s => s.teacherId === teacher.id);
  const lastActiveAt = own.reduce<string | null>((latest, s) => (!latest || s.createdAt > latest ? s.createdAt : latest), null);
  return { ...toPublic(teacher), sessionCount: own.length, lastActiveAt };
}

export const mockApi: Api = {
  async login(email, password) {
    await delay();
    const db = load();
    const teacher = db.teachers.find(t => t.email === email.trim().toLowerCase());
    if (!teacher || teacher.password !== password) throw new ApiError('Invalid email or password.', 401);
    if (teacher.status === 'pending') throw new ApiError('Your account is awaiting approval from the portal administrator.', 403);
    if (teacher.status === 'disabled') throw new ApiError('This account has been disabled. Please contact the portal administrator.', 403);
    return { accessToken: issueToken(teacher), teacher: toPublic(teacher) };
  },

  async register(input) {
    await delay();
    const db = load();
    const email = input.email.trim().toLowerCase();
    if (db.teachers.some(t => t.email === email)) throw new ApiError('An account with this email already exists.', 409);
    db.teachers.push({ ...input, email, id: `t-${pseudoToken(email + Date.now()).slice(0, 10)}`, role: 'teacher', status: 'pending', createdAt: new Date().toISOString() });
    save(db);
    return { status: 'pending' };
  },

  async me() {
    await delay(120);
    return toPublic(currentTeacher(load()));
  },

  async updateProfile(input) {
    await delay();
    const db = load();
    const teacher = currentTeacher(db);
    Object.assign(teacher, input);
    save(db);
    return toPublic(teacher);
  },

  async changePassword(currentPassword, newPassword) {
    await delay();
    const db = load();
    const teacher = currentTeacher(db);
    if (teacher.password !== currentPassword) throw new ApiError('Current password is incorrect.', 400);
    teacher.password = newPassword;
    save(db);
  },

  async start(input) {
    await delay();
    const db = load();
    const teacher = currentTeacher(db);
    if (!isGoogleFormsUrl(input.googleFormUrl)) throw new ApiError('A valid Google Forms URL is required', 400);
    const session: AttendanceSession = {
      ...input,
      googleFormUrl: input.googleFormUrl.trim(),
      id: `s-${pseudoToken(teacher.id + Date.now()).slice(0, 12)}`,
      teacherId: teacher.id,
      status: 'active',
      createdAt: new Date().toISOString(),
      stoppedAt: null,
      checkIns: 0,
    };
    db.sessions.push(session);
    save(db);
    return { sessionId: session.id };
  },

  async stop(sessionId) {
    await delay();
    const db = load();
    const session = ownedSession(db, sessionId);
    if (session.status !== 'active') throw new ApiError('Active attendance session not found', 404);
    session.status = 'stopped';
    session.stoppedAt = new Date().toISOString();
    save(db);
    return { stopped: true };
  },

  async qr(sessionId) {
    await delay(60);
    const db = load();
    const session = ownedSession(db, sessionId);
    if (session.status !== 'active') throw new ApiError('Active attendance session not found', 404);
    // Simulate students trickling in while the QR is on screen.
    const classSize = session.sessionType === 'Lab' ? 28 : 62;
    if (session.checkIns < classSize && Math.random() < 0.55) session.checkIns += 1 + Math.floor(Math.random() * 2);
    save(db);
    const windowMs = QR_TTL_SECONDS * 1000;
    const now = Date.now();
    const token = pseudoToken(`${sessionId}:${Math.floor(now / windowMs)}`);
    return { token, qrUrl: `http://localhost:3000/a/${token}`, ttlRemaining: Math.ceil((windowMs - (now % windowMs)) / 1000) };
  },

  async session(sessionId) {
    await delay(150);
    return ownedSession(load(), sessionId);
  },

  async sessions() {
    await delay();
    const db = load();
    const teacher = currentTeacher(db);
    return db.sessions.filter(s => s.teacherId === teacher.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async faculty() {
    await delay();
    const db = load();
    requireAdmin(db);
    return db.teachers.map(t => withFacultyStats(db, t)).sort((a, b) => a.name.localeCompare(b.name));
  },

  async addFaculty(input) {
    await delay();
    const db = load();
    requireAdmin(db);
    const email = input.email.trim().toLowerCase();
    if (db.teachers.some(t => t.email === email)) throw new ApiError('An account with this email already exists.', 409);
    const temporaryPassword = pseudoToken(email + Date.now()).slice(0, 10);
    const teacher: MockTeacher = { ...input, email, password: temporaryPassword, id: `t-${pseudoToken(email).slice(0, 10)}`, status: 'active', createdAt: new Date().toISOString() };
    db.teachers.push(teacher);
    save(db);
    return { teacher: withFacultyStats(db, teacher), temporaryPassword };
  },

  async setFacultyStatus(teacherId, status) {
    await delay();
    const db = load();
    const admin = requireAdmin(db);
    if (teacherId === admin.id) throw new ApiError('You cannot change the status of your own account.', 400);
    const teacher = db.teachers.find(t => t.id === teacherId);
    if (!teacher) throw new ApiError('Faculty member not found', 404);
    teacher.status = status;
    save(db);
    return withFacultyStats(db, teacher);
  },
};
