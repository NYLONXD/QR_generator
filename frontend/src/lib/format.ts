const LOCALE = 'en-IN';

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const numberFmt = new Intl.NumberFormat(LOCALE);

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (date: Date) => shortDateFmt.format(date);
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatLongDate = (date: Date) => weekdayFmt.format(date);
export const formatNumber = (value: number) => numberFmt.format(value);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Today", "Yesterday", or a date. */
export function formatDay(iso: string, now = new Date()) {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatDate(iso);
}

export function formatRelative(iso: string | null | undefined, now = new Date()) {
  if (!iso) return 'Never';
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export function formatDuration(startIso: string, endIso: string | null, now = new Date()) {
  const ms = (endIso ? new Date(endIso) : now).getTime() - new Date(startIso).getTime();
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Stopwatch format for a running session: 4:07 or 1:04:07. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const TITLES = /^(dr|prof|mr|mrs|ms|er)\.?\s+/i;

/** "Dr. Arjun Malhotra" → "Dr. Malhotra"; "Arjun Malhotra" → "Arjun". */
export function salutation(name: string) {
  const title = name.match(TITLES)?.[0].trim();
  const parts = name.replace(TITLES, '').trim().split(/\s+/);
  return title ? `${title} ${parts[parts.length - 1]}` : parts[0];
}

export function initials(name: string) {
  const parts = name.replace(TITLES, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
