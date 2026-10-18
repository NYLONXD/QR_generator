import { AttendanceSession } from '../services/types';

const DAY = 86_400_000;

export interface DailyPoint { date: Date; checkIns: number; sessions: number }

export interface DashboardStats {
  sessions30d: number;
  sessionsPrev30d: number;
  checkIns30d: number;
  checkInsPrev30d: number;
  avgCheckIns: number;
  courses30d: number;
  daily: DailyPoint[];
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Rolling 30-day figures (compared with the 30 days before) and a 14-day daily series. */
export function dashboardStats(sessions: AttendanceSession[], now = new Date()): DashboardStats {
  const today = startOfDay(now).getTime();
  const cutoff = today - 29 * DAY;
  const prevCutoff = cutoff - 30 * DAY;
  const recent = sessions.filter(s => new Date(s.createdAt).getTime() >= cutoff);
  const previous = sessions.filter(s => {
    const t = new Date(s.createdAt).getTime();
    return t >= prevCutoff && t < cutoff;
  });
  const sum = (list: AttendanceSession[]) => list.reduce((total, s) => total + s.checkIns, 0);

  const daily: DailyPoint[] = Array.from({ length: 14 }, (_, i) => ({ date: new Date(today - (13 - i) * DAY), checkIns: 0, sessions: 0 }));
  for (const s of sessions) {
    const index = 13 - Math.round((today - startOfDay(new Date(s.createdAt)).getTime()) / DAY);
    if (index >= 0 && index < 14) {
      daily[index].checkIns += s.checkIns;
      daily[index].sessions += 1;
    }
  }

  const checkIns30d = sum(recent);
  return {
    sessions30d: recent.length,
    sessionsPrev30d: previous.length,
    checkIns30d,
    checkInsPrev30d: sum(previous),
    avgCheckIns: recent.length ? Math.round(checkIns30d / recent.length) : 0,
    courses30d: new Set(recent.map(s => s.courseCode)).size,
    daily,
  };
}

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
