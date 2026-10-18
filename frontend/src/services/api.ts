import { mockApi } from './mockApi';
import { getToken } from './token';
import { Api, ApiError, LoginResponse, QrResponse, Teacher } from './types';

export * from './types';
export { clearToken, getToken, setToken } from './token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
/** Demo mode: `npm run dev:mock` (Vite --mode mock), or VITE_USE_MOCK=true in any env file. */
export const USE_MOCK = import.meta.env.MODE === 'mock' || import.meta.env.VITE_USE_MOCK === 'true';

/** Reads the teacher out of the JWT payload so the UI can render before /auth/me exists. */
export function teacherFromToken(jwt: string): Teacher | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub || !payload.email) return null;
    return { id: payload.sub, email: payload.email, name: payload.name ?? payload.email, role: payload.role ?? 'teacher' };
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    let message = response.statusText;
    try { message = (await response.json()).message ?? message; } catch { /* non-JSON error body */ }
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });

// Endpoints marked "planned" are not in the NestJS backend yet; see README "Frontend API contract".
const httpApi: Api = {
  login: async (email, password) => {
    const result = await request<LoginResponse>('/auth/login', post({ email, password }));
    // The current backend doesn't send a role yet; treat everyone as faculty until it does.
    return { ...result, teacher: { ...result.teacher, role: result.teacher.role ?? 'teacher' } };
  },
  register: input => request('/auth/register', post(input)), // planned
  me: () => request('/auth/me'), // planned
  updateProfile: input => request('/auth/me', patch(input)), // planned
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', post({ currentPassword, newPassword })), // planned

  start: input => request('/attendance/start', post(input)),
  stop: sessionId => request('/attendance/stop', post({ sessionId })),
  qr: sessionId => request<QrResponse>(`/attendance/${sessionId}/qr`),
  session: sessionId => request(`/attendance/sessions/${sessionId}`), // planned
  sessions: () => request('/attendance/sessions'), // planned

  faculty: () => request('/admin/faculty'), // planned
  addFaculty: input => request('/admin/faculty', post(input)), // planned
  setFacultyStatus: (teacherId, status) => request(`/admin/faculty/${teacherId}`, patch({ status })), // planned
};

export const AUTH_EXPIRED_EVENT = 'auth:expired';

/** Broadcasts a 401 from any call (except login itself) so AuthProvider can sign the user out. */
function withAuthExpiry(impl: Api): Api {
  const wrapped: Record<string, unknown> = {};
  for (const [name, fn] of Object.entries(impl) as [string, (...args: unknown[]) => Promise<unknown>][]) {
    wrapped[name] = async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (name !== 'login' && error instanceof ApiError && error.status === 401) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        throw error;
      }
    };
  }
  return wrapped as unknown as Api;
}

export const api: Api = withAuthExpiry(USE_MOCK ? mockApi : httpApi);

/** Shows the server's message for client errors (bad input, auth); everything else gets the fallback. */
export function errorMessage(error: unknown, fallback: string) {
  const clientError = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 404;
  return clientError && error.message ? error.message : fallback;
}
