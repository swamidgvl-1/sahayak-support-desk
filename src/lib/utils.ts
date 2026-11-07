import clsx, { type ClassValue } from 'clsx';

export const cn = (...v: ClassValue[]) => clsx(v);

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Sahayak';
export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'Campus Support Desk';

export function fmtDate(d?: string | null, withTime = true) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Kolkata',
  });
}

export function timeAgo(d: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return fmtDate(d, false);
}

export function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export function fmtDuration(hours: number | null) {
  if (hours == null || Number.isNaN(hours)) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export type SlaState = 'ok' | 'warn' | 'over' | 'done';

/** SLA is a *response* deadline: it stops once someone has replied. */
export function slaInfo(t: { sla_deadline: string | null; created_at: string; first_response_at: string | null; status: string }, warnPct = 25, now = Date.now()) {
  if (t.status === 'resolved' || t.status === 'closed' || t.first_response_at || !t.sla_deadline) {
    return { state: 'done' as SlaState, label: t.first_response_at ? 'Responded' : '—' };
  }
  const end = new Date(t.sla_deadline).getTime();
  const total = end - new Date(t.created_at).getTime();
  const left = end - now;
  const abs = Math.abs(left);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const txt = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  if (left <= 0) return { state: 'over' as SlaState, label: `Overdue by ${txt}` };
  if (left <= total * (warnPct / 100)) return { state: 'warn' as SlaState, label: `${txt} left` };
  return { state: 'ok' as SlaState, label: `${txt} left` };
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120);
}

export function fileExt(name: string) {
  return (name.split('.').pop() || '').toLowerCase();
}

export function csvEscape(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
