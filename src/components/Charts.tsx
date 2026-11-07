import { cn } from '@/lib/utils';

export const PALETTE = ['#c0752f', '#2f8f83', '#6b7fd7', '#c4515c', '#8a9a3b', '#9a6fb0', '#3f9fc9', '#b08968'];

export interface Datum { label: string; value: number }

export function Donut({ data, size = 150 }: { data: Datum[]; size?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  if (!total) return <p className="py-6 text-center text-sm text-muted">No data in this range.</p>;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="Donut chart">
        <g transform="rotate(-90 70 70)">
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="20"
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="70" y="68" textAnchor="middle" className="fill-ink text-2xl font-semibold" style={{ fontSize: 24, fontWeight: 600 }}>{total}</text>
        <text x="70" y="86" textAnchor="middle" className="fill-muted" style={{ fontSize: 10 }}>tickets</text>
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{d.label}</span>
            <span className="tabular-nums text-muted">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Bars({ data, color = PALETTE[0], className }: { data: Datum[]; color?: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-muted">No data in this range.</p>;
  return (
    <ul className={cn('space-y-2', className)}>
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(80px,38%)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={d.label}>{d.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-sunken">
            <span className="block h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </span>
          <span className="w-8 text-right tabular-nums text-muted">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function LineChart({ data, color = PALETTE[1] }: { data: Datum[]; color?: string }) {
  if (data.length < 2) return <p className="py-6 text-center text-sm text-muted">Not enough data yet.</p>;
  const W = 600, H = 170, P = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const step = Math.ceil(data.length / 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Line chart of tickets over time">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="rgb(var(--line))" strokeDasharray="3 3" />
          <text x={4} y={y(max * f) + 3} fill="rgb(var(--muted))" style={{ fontSize: 10 }}>{Math.round(max * f)}</text>
        </g>
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label + i}>
          <circle cx={x(i)} cy={y(d.value)} r="3" fill={color}><title>{`${d.label}: ${d.value}`}</title></circle>
          {i % step === 0 && <text x={x(i)} y={H - 6} textAnchor="middle" fill="rgb(var(--muted))" style={{ fontSize: 10 }}>{d.label}</text>}
        </g>
      ))}
    </svg>
  );
}

export function Kpi({ label, value, icon, tone }: { label: string; value: string | number; icon?: React.ReactNode; tone?: 'danger' | 'good' }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      {icon && <div className={cn('rounded-lg bg-sunken p-2 text-accent', tone === 'danger' && 'text-red-600', tone === 'good' && 'text-green-600')}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-2xl font-semibold tabular-nums leading-tight">{value}</div>
        <div className="truncate text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
