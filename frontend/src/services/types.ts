export type Role = 'teacher' | 'admin';
export type TeacherStatus = 'active' | 'pending' | 'disabled';
export type SessionType = 'Lecture' | 'Tutorial' | 'Lab';
export type SessionStatus = 'active' | 'stopped';

export interface Teacher {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string;
  designation?: string;
  status?: TeacherStatus;
  createdAt?: string;
  /** Only present on admin faculty listings. */
  sessionCount?: number;
  lastActiveAt?: string | null;
}

export interface AttendanceSession {
  id: string;
  teacherId: string;
  courseCode: string;
  courseTitle: string;
  group: string;
  sessionType: SessionType;
  googleFormUrl: string;
  status: SessionStatus;
  createdAt: string;
  stoppedAt: string | null;
  /** Students who passed QR validation and were let through to the form. */
  checkIns: number;
}

export interface QrResponse { token: string; qrUrl: string; ttlRemaining: number }

export interface LoginResponse { accessToken: string; teacher: Teacher }

export interface RegisterInput {
  name: string;
  email: string;
  department: string;
  designation: string;
  password: string;
}

export interface StartSessionInput {
  courseCode: string;
  courseTitle: string;
  group: string;
  sessionType: SessionType;
  googleFormUrl: string;
}

export interface ProfileInput { name: string; department: string; designation: string }

export interface NewFacultyInput {
  name: string;
  email: string;
  department: string;
  designation: string;
  role: Role;
}

export interface Api {
  login(email: string, password: string): Promise<LoginResponse>;
  register(input: RegisterInput): Promise<{ status: 'pending' }>;
  me(): Promise<Teacher>;
  updateProfile(input: ProfileInput): Promise<Teacher>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  start(input: StartSessionInput): Promise<{ sessionId: string }>;
  stop(sessionId: string): Promise<{ stopped: boolean }>;
  qr(sessionId: string): Promise<QrResponse>;
  session(sessionId: string): Promise<AttendanceSession>;
  sessions(): Promise<AttendanceSession[]>;

  faculty(): Promise<Teacher[]>;
  addFaculty(input: NewFacultyInput): Promise<{ teacher: Teacher; temporaryPassword: string }>;
  setFacultyStatus(teacherId: string, status: TeacherStatus): Promise<Teacher>;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
