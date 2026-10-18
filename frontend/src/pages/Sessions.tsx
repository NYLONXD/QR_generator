import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Plus, QrCode, Search, SearchX } from 'lucide-react';
import { Alert, EmptyState, LoadingBlock, PageHeader, SessionStatusBadge } from '../components/ui';
import { useLoader } from '../hooks/useLoader';
import { formatDate, formatDuration, formatNumber, formatTime } from '../lib/format';
import { api, AttendanceSession } from '../services/api';

const PAGE_SIZE = 10;
const RANGES = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: Infinity },
] as const;
type RangeId = typeof RANGES[number]['id'];

function downloadCsv(sessions: AttendanceSession[]) {
  const header = ['Course code', 'Course title', 'Group', 'Type', 'Date', 'Start', 'End', 'Check-ins', 'Status'];
  const rows = sessions.map(s => [
    s.courseCode, s.courseTitle, s.group, s.sessionType, formatDate(s.createdAt), formatTime(s.createdAt),
    s.stoppedAt ? formatTime(s.stoppedAt) : '', String(s.checkIns), s.status === 'active' ? 'Live' : 'Ended',
  ]);
  const escape = (raw: string) => {
    const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; // stop spreadsheets treating text as a formula
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const csv = [header, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `attendance-sessions-${new Date().toISOString().slice(0, 10)}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

export function Sessions() {
  const { data: sessions, error, loading } = useLoader(() => api.sessions());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'stopped'>('all');
  const [range, setRange] = useState<RangeId>('30');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const q = query.trim().toLowerCase();
    const days = RANGES.find(r => r.id === range)!.days;
    const cutoff = Date.now() - days * 86_400_000;
    return sessions.filter(s =>
      (status === 'all' || s.status === status) &&
      (days === Infinity || new Date(s.createdAt).getTime() >= cutoff) &&
      (!q || `${s.courseCode} ${s.courseTitle} ${s.group}`.toLowerCase().includes(q)));
  }, [sessions, query, status, range]);

  useEffect(() => setPage(0), [query, status, range]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalCheckIns = filtered.reduce((sum, s) => sum + s.checkIns, 0);

  return (
    <>
      <PageHeader
        title="Session history"
        subtitle="Every attendance session you have run. Responses for each one are in its Google Form."
        actions={<>
          <button type="button" className="btn" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}><Download size={18} />Export CSV</button>
          <Link to="/sessions/new" className="btn btn-primary"><Plus size={18} />Start session</Link>
        </>}
      />

      {error && !sessions ? (
        <Alert tone="warning">Session history could not be loaded. Refresh the page to try again.</Alert>
      ) : !sessions ? (
        <div className="card"><LoadingBlock label="Loading sessions…" /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState icon={QrCode} title="No sessions yet" description="Sessions you start will be listed here with their check-in counts."
            action={<Link to="/sessions/new" className="btn btn-primary"><Plus size={18} />Start your first session</Link>} />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="input-wrap has-icon">
              <Search size={18} />
              <input className="input" type="search" placeholder="Search by course or group" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search sessions" />
            </div>
            <select className="select" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Live</option>
              <option value="stopped">Ended</option>
            </select>
            <div className="segmented" role="group" aria-label="Date range">
              {RANGES.map(r => <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
            </div>
          </div>

          <section className="card" style={{ opacity: loading ? 0.6 : 1 }}>
            {filtered.length === 0 ? (
              <EmptyState icon={SearchX} title="No matching sessions" description="Try a different search, status or date range." />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Group</th>
                        <th>Date</th>
                        <th>Open for</th>
                        <th className="num">Check-ins</th>
                        <th>Status</th>
                        <th className="actions"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="cell-primary">{s.courseCode} · {s.courseTitle}</div>
                            <div className="cell-secondary">{s.sessionType}</div>
                          </td>
                          <td>{s.group}</td>
                          <td>
                            <div>{formatDate(s.createdAt)}</div>
                            <div className="cell-secondary">{formatTime(s.createdAt)}</div>
                          </td>
                          <td className="tabular">{s.status === 'active' ? '—' : formatDuration(s.createdAt, s.stoppedAt)}</td>
                          <td className="num"><strong>{s.checkIns}</strong></td>
                          <td><SessionStatusBadge status={s.status} /></td>
                          <td className="actions">
                            {s.status === 'active'
                              ? <Link to={`/sessions/${s.id}/live`} className="btn btn-sm btn-primary">Show QR</Link>
                              : <a href={s.googleFormUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" aria-label={`Open Google Form for ${s.courseCode} on ${formatDate(s.createdAt)}`}>
                                  Form <ExternalLink size={14} />
                                </a>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <span>
                    {formatNumber(filtered.length)} session{filtered.length === 1 ? '' : 's'} · {formatNumber(totalCheckIns)} check-ins
                    {pageCount > 1 && <> · page {page + 1} of {pageCount}</>}
                  </span>
                  {pageCount > 1 && (
                    <div className="pagination-buttons">
                      <button type="button" className="btn btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft size={16} />Previous</button>
                      <button type="button" className="btn btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= pageCount - 1}>Next<ChevronRight size={16} /></button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
