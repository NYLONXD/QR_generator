const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface QrResponse { token: string; qrUrl: string; ttlRemaining: number }

let token = localStorage.getItem('teacher_jwt') ?? '';
export const getToken = () => token;
export const setToken = (value: string) => { token = value; localStorage.setItem('teacher_jwt', value); };
export const clearToken = () => { token = ''; localStorage.removeItem('teacher_jwt'); };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) => request<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  start: (googleFormUrl: string) => request<{ sessionId: string }>('/attendance/start', { method: 'POST', body: JSON.stringify({ googleFormUrl }) }),
  stop: (sessionId: string) => request<{ stopped: boolean }>('/attendance/stop', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  qr: (sessionId: string) => request<QrResponse>(`/attendance/${sessionId}/qr`),
};
