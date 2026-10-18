import { useCallback, useRef, useState } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';
import { formatNumber, formatShortDate } from '../lib/format';
import { DailyPoint } from '../lib/stats';

const H = 230;
const PAD = { top: 22, right: 6, bottom: 30, left: 34 };
const PLOT_H = H - PAD.top - PAD.bottom;
const MAX_BAR = 24;
const weekdayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Rounds the axis max up to a clean 1/2/5 × 10ⁿ step so ticks read naturally. */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= raw)!;
  return { max: step * Math.ceil(max / step), step };
}

/** Column with a 4px rounded data end and a square baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  const base = y + h;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/** Tracks the element's width so the SVG is drawn 1:1 and axis text never scales down on phones. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const [width, setWidth] = useState(fallback);
  const observer = useRef<ResizeObserver | null>(null);
  // Callback ref, so it re-attaches when the chart remounts after switching back from the table view.
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.current.observe(el);
  }, []);
  return [ref, width] as const;
}

export function CheckInChart({ data }: { data: DailyPoint[] }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [hover, setHover] = useState<number | null>(null);
  const [chartRef, W] = useWidth<HTMLDivElement>(640);

  const total = data.reduce((sum, d) => sum + d.checkIns, 0);
  const sessions = data.reduce((sum, d) => sum + d.sessions, 0);
  const peak = data.reduce((best, d, i) => (d.checkIns > data[best].checkIns ? i : best), 0);
  const { max, step } = niceScale(Math.max(...data.map(d => d.checkIns)));
  const band = (W - PAD.left - PAD.right) / data.length;
  const labelStep = band < 30 ? 3 : 2; // date labels are ~40px wide
  const barW = Math.min(MAX_BAR, band * 0.62);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  return (
    <section className="card">
      <div className="card-header plain">
        <div>
          <h2 className="card-title">Check-ins, last 14 days</h2>
          <p className="card-subtitle">{formatNumber(total)} students checked in across {sessions} session{sessions === 1 ? '' : 's'}</p>
        </div>
        <div className="segmented" role="group" aria-label="Display as">
          <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}><ChartColumn size={15} />Chart</button>
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}><Table2 size={15} />Table</button>
        </div>
      </div>
      <div className="card-body">
        {view === 'chart' ? (
          <div className="chart" ref={chartRef} onPointerLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Daily check-ins for the last 14 days, ${formatNumber(total)} in total. Switch to table view for exact values.`}>
              {ticks.map(t => (
                <g key={t}>
                  <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
                  <text className="axis-label" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
                </g>
              ))}
              {data.map((d, i) => {
                const bx = PAD.left + i * band + (band - barW) / 2;
                const top = y(d.checkIns);
                const labelEvery = data.length - 1 - i;
                return (
                  <g key={d.date.toISOString()}>
                    <rect
                      className="bar-hit"
                      x={PAD.left + i * band} y={PAD.top} width={band} height={PLOT_H}
                      tabIndex={0}
                      aria-label={`${weekdayFmt.format(d.date)}: ${d.checkIns} check-ins, ${d.sessions} sessions`}
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                    />
                    {d.checkIns > 0
                      ? <path className="bar" d={barPath(bx, top, barW, PAD.top + PLOT_H - top)} style={{ opacity: hover === null || hover === i ? 1 : 0.45 }} />
                      : <rect className="bar-zero" x={bx} y={PAD.top + PLOT_H - 2} width={barW} height={2} rx={1} />}
                    {i === peak && d.checkIns > 0 && hover === null && (
                      <text className="axis-label" x={bx + barW / 2} y={top - 7} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 700 }}>{d.checkIns}</text>
                    )}
                    {labelEvery % labelStep === 0 && (
                      <text className="axis-label" x={bx + barW / 2} y={H - 8} textAnchor="middle" style={labelEvery === 0 ? { fill: 'var(--text)', fontWeight: 600 } : undefined}>
                        {labelEvery === 0 ? 'Today' : formatShortDate(d.date)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {hover !== null && (
              <div className="chart-tooltip" style={{ left: `${((PAD.left + hover * band + band / 2) / W) * 100}%`, top: `${(y(data[hover].checkIns) / H) * 100}%` }}>
                <strong>{data[hover].checkIns} check-ins</strong>
                <span>{weekdayFmt.format(data[hover].date)} · {data[hover].sessions} session{data[hover].sessions === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="chart-table">
            <table className="table">
              <thead><tr><th>Date</th><th className="num">Sessions</th><th className="num">Check-ins</th></tr></thead>
              <tbody>
                {[...data].reverse().map(d => (
                  <tr key={d.date.toISOString()}>
                    <td>{weekdayFmt.format(d.date)}</td>
                    <td className="num">{d.sessions}</td>
                    <td className="num">{d.checkIns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
