import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarCheck, Plus, QrCode, Radio, UserCheck, Users } from 'lucide-react';
import { useShell } from '../components/AppLayout';
import { CheckInChart } from '../components/CheckInChart';
import { Alert, EmptyState, PageHeader, SessionStatusBadge, StatTile } from '../components/ui';
import { useTeacher } from '../context/AuthContext';
import { useLoader } from '../hooks/useLoader';
import { formatDay, formatLongDate, formatNumber, formatTime, greeting, salutation } from '../lib/format';
import { dashboardStats, percentChange } from '../lib/stats';
import { api, AttendanceSession } from '../services/api';

function KpiSkeleton() {
  return (
    <div className="kpi-row" aria-hidden="true">
      {[0, 1, 2, 3].map(i => <div key={i} className="card stat"><div className="skeleton" style={{ height: 14, width: '60%' }} /><div className="skeleton" style={{ height: 30, width: '40%' }} /><div className="skeleton" style={{ height: 12, width: '70%' }} /></div>)}
    </div>
  );
}

function RecentSessions({ sessions }: { sessions: AttendanceSession[] }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Recent sessions</h2>
          <p className="card-subtitle">Your latest attendance sessions</p>
        </div>
        <Link to="/sessions" className="btn btn-ghost btn-sm">View all <ArrowRight size={15} /></Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState icon={QrCode} title="No sessions yet" description="Start your first session and it will show up here."
          action={<Link to="/sessions/new" className="btn btn-primary"><Plus size={18} />Start a session</Link>} />
      ) : (
        <ul className="session-list">
          {sessions.slice(0, 6).map(s => (
            <li key={s.id} className="session-item">
              <span className="course-chip">{s.courseCode}</span>
              <div className="session-item-text">
                <div className="session-item-title">{s.courseTitle}</div>
                <div className="session-item-meta">{s.group} · {s.sessionType} · {formatDay(s.createdAt)}, {formatTime(s.createdAt)}</div>
              </div>
              {s.status === 'active'
                ? <Link to={`/sessions/${s.id}/live`} aria-label={`Open live session for ${s.courseCode}`}><SessionStatusBadge status="active" /></Link>
                : <div className="session-item-count"><strong>{s.checkIns}</strong><span>check-ins</span></div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Dashboard() {
  const teacher = useTeacher();
  const { activeSession } = useShell();
  const { data: sessions, error, loading } = useLoader(() => api.sessions());
  const stats = sessions ? dashboardStats(sessions) : null;
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(now)}
        title={`${greeting(now)}, ${salutation(teacher.name)}`}
        subtitle={teacher.department ? `${teacher.designation ? `${teacher.designation}, ` : ''}${teacher.department}` : 'Here is how your classes are checking in.'}
        actions={<Link to="/sessions/new" className="btn btn-primary btn-lg"><Plus size={19} />Start attendance</Link>}
      />

      {activeSession && (
        <div className="live-banner">
          <span className="live-banner-icon"><Radio size={22} /></span>
          <div className="live-banner-text">
            <span className="live-banner-label"><span className="live-dot" />Session live now</span>
            <p className="live-banner-title">{activeSession.courseCode} · {activeSession.courseTitle}</p>
            <p className="live-banner-meta">Group {activeSession.group} · started {formatTime(activeSession.createdAt)} · {activeSession.checkIns} checked in so far</p>
          </div>
          <Link to={`/sessions/${activeSession.id}/live`} className="btn btn-primary">Show QR code <ArrowRight size={17} /></Link>
        </div>
      )}

      {error && !sessions ? (
        <Alert tone="warning">Session history is not available yet. You can still start a new attendance session.</Alert>
      ) : !stats ? (
        <KpiSkeleton />
      ) : (
        <div className="kpi-row" style={{ opacity: loading ? 0.6 : 1 }}>
          <StatTile label="Sessions in 30 days" icon={CalendarCheck} value={formatNumber(stats.sessions30d)}
            change={percentChange(stats.sessions30d, stats.sessionsPrev30d)} changeLabel="vs previous 30 days"
            foot={percentChange(stats.sessions30d, stats.sessionsPrev30d) == null && 'No earlier sessions to compare'} />
          <StatTile label="Check-ins in 30 days" icon={UserCheck} value={formatNumber(stats.checkIns30d)}
            change={percentChange(stats.checkIns30d, stats.checkInsPrev30d)} changeLabel="vs previous 30 days"
            foot={percentChange(stats.checkIns30d, stats.checkInsPrev30d) == null && 'No earlier sessions to compare'} />
          <StatTile label="Average per session" icon={Users} value={formatNumber(stats.avgCheckIns)} foot="Students checked in" />
          <StatTile label="Courses in 30 days" icon={BookOpen} value={formatNumber(stats.courses30d)} foot="Distinct course codes" />
        </div>
      )}

      {sessions && stats && (
        <div className="dash-grid">
          <CheckInChart data={stats.daily} />
          <RecentSessions sessions={sessions} />
        </div>
      )}
    </>
  );
}
