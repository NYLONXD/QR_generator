import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, AUTH_EXPIRED_EVENT, clearToken, getToken, setToken, Teacher, teacherFromToken } from '../services/api';

const PROFILE_KEY = 'teacher_profile';

interface AuthValue {
  teacher: Teacher | null;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  setTeacher(teacher: Teacher): void;
}

const AuthContext = createContext<AuthValue | null>(null);

function cachedTeacher(): Teacher | null {
  const token = getToken();
  if (!token) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as Teacher | null;
    const fromToken = teacherFromToken(token);
    if (cached && (!fromToken || cached.id === fromToken.id)) return cached;
    return fromToken;
  } catch {
    return teacherFromToken(token);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacherState] = useState<Teacher | null>(cachedTeacher);

  const setTeacher = useCallback((next: Teacher) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setTeacherState(next);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(PROFILE_KEY);
    setTeacherState(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email.trim().toLowerCase(), password);
    setToken(result.accessToken);
    setTeacher(result.teacher);
  }, [setTeacher]);

  // Refresh the profile once per load; a 401 means the token expired.
  // Any other failure (e.g. /auth/me not built yet) keeps the cached profile.
  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setTeacher).catch(error => {
      if (error instanceof ApiError && error.status === 401) logout();
    });
  }, [setTeacher, logout]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  const value = useMemo(() => ({ teacher, login, logout, setTeacher }), [teacher, login, logout, setTeacher]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** For pages behind <RequireAuth>, where a teacher is guaranteed. */
export function useTeacher() {
  const { teacher } = useAuth();
  if (!teacher) throw new Error('useTeacher used outside an authenticated route');
  return teacher;
}
