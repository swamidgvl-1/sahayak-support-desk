import type { SupabaseClient } from '@supabase/supabase-js';
import { hoursBetween } from '@/lib/utils';

export interface ATicket {
  id: string; status: string; priority: string; category_id: string | null; assigned_to: string | null;
  created_at: string; first_response_at: string | null; resolved_at: string | null; rating: number | null; sla_deadline: string | null;
}
const COLS = 'id,status,priority,category_id,assigned_to,created_at,first_response_at,resolved_at,rating,sla_deadline';

/** PostgREST returns at most 1000 rows per request, so page through the results. */
export async function fetchTickets(supabase: SupabaseClient, from?: string, to?: string, max = 10000): Promise<ATicket[]> {
  const out: ATicket[] = [];
  for (let start = 0; start < max; start += 1000) {
    let q = supabase.from('tickets').select(COLS).order('created_at', { ascending: false }).range(start, start + 999);
    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(new Date(to).getTime() + 86_399_000).toISOString());
    const { data } = await q;
    out.push(...((data ?? []) as ATicket[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const isOpenKind = (kind?: string) => kind !== 'resolved' && kind !== 'closed';

export function isOverdue(t: ATicket, now = Date.now()) {
  return !t.first_response_at && !!t.sla_deadline && new Date(t.sla_deadline).getTime() < now && t.status !== 'resolved' && t.status !== 'closed';
}

export function countBy<T>(items: T[], key: (t: T) => string | null | undefined, labels?: Record<string, string>) {
  const m = new Map<string, number>();
  items.forEach((i) => { const k = key(i) ?? '—'; m.set(k, (m.get(k) ?? 0) + 1); });
  return Array.from(m, ([k, value]) => ({ label: labels?.[k] ?? k, value })).sort((a, b) => b.value - a.value);
}

export function topN(data: { label: string; value: number }[], n = 7) {
  if (data.length <= n) return data;
  const rest = data.slice(n).reduce((a, d) => a + d.value, 0);
  return [...data.slice(0, n), { label: 'Other', value: rest }];
}

const IST = 5.5 * 3_600_000;
const istDate = (iso: string) => new Date(new Date(iso).getTime() + IST);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function bucket(tickets: ATicket[], by: 'day' | 'week' | 'month', days?: number) {
  const m = new Map<string, number>();
  tickets.forEach((t) => {
    const d = istDate(t.created_at);
    let key: string;
    if (by === 'day') key = ymd(d);
    else if (by === 'month') key = ymd(d).slice(0, 7);
    else { const w = new Date(d); w.setUTCDate(w.getUTCDate() - ((w.getUTCDay() + 6) % 7)); key = ymd(w); }
    m.set(key, (m.get(key) ?? 0) + 1);
  });
  // fill gaps for daily series
  if (by === 'day' && days) {
    const end = istDate(new Date().toISOString());
    for (let i = days - 1; i >= 0; i--) { const d = new Date(end); d.setUTCDate(d.getUTCDate() - i); const k = ymd(d); if (!m.has(k)) m.set(k, 0); }
  }
  return Array.from(m, ([k, value]) => ({ key: k, label: by === 'month' ? k : k.slice(5), value }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(days ? -days : -24);
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const avgResolutionHours = (t: ATicket[]) => avg(t.filter((x) => x.resolved_at).map((x) => hoursBetween(x.created_at, x.resolved_at!)));
export const avgFirstResponseHours = (t: ATicket[]) => avg(t.filter((x) => x.first_response_at).map((x) => hoursBetween(x.created_at, x.first_response_at!)));
