const TOKEN_KEY = 'teacher_jwt';

let token = localStorage.getItem(TOKEN_KEY) ?? '';
export const getToken = () => token;
export const setToken = (value: string) => { token = value; localStorage.setItem(TOKEN_KEY, value); };
export const clearToken = () => { token = ''; localStorage.removeItem(TOKEN_KEY); };
