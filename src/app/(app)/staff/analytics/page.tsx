import Link from 'next/link';
import { Star } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { Bars, Donut, Kpi, LineChart } from '@/components/Charts';
import { avg, avgFirstResponseHours, avgResolutionHours, bucket, countBy, fetchTickets, isOverdue, topN } from '@/lib/analytics';
import { fmtDuration } from '@/lib/utils';

export const metadata = { title: 'Analytics' };

export default async function Analytics({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  await requireProfile(['faculty', 'admin']);
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const today = new Date();
  const from = searchParams.from || new Date(today.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const to = searchParams.to || '';
  const tickets = await fetchTickets(supabase, from, to);

  const [{ data: staffList }, { data: depts }, reopened] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('role', ['faculty', 'admin']),
    supabase.from('departments').select('id, name'),
    supabase.from('ticket_messages').select('id', { count: 'exact', head: true }).eq('kind', 'system').ilike('body', '%→ Reopened').gte('created_at', new Date(from).toISOString()),
  ]);
  const cLabel = Object.fromEntries(cfg.categories.map((c) => [c.id, c.name]));
  const dLabel = Object.fromEntries((depts ?? []).map((d: any) => [d.id, d.name]));
  const catDept = Object.fromEntries(cfg.categories.map((c) => [c.id, c.department_id]));
  const names = Object.fromEntries((staffList ?? []).map((s: any) => [s.id, s.full_name]));

  const done = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const rated = tickets.filter((t) => t.rating).map((t) => t.rating!);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: rated.filter((r) => r === n).length }));
  const resolvedPct = tickets.length ? Math.round((done / tickets.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="text-xs text-muted">From<input type="date" name="from" defaultValue={from} className="input" /></label>
          <label className="text-xs text-muted">To<input type="date" name="to" defaultValue={to} className="input" /></label>
          <button className="btn btn-primary">Apply</button>
          <Link href="/staff/analytics" className="btn">Reset</Link>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
        <Kpi label="Total tickets" value={tickets.length} />
        <Kpi label="Resolution rate" value={`${resolvedPct}%`} tone="good" />
        <Kpi label="Avg. resolution time" value={fmtDuration(avgResolutionHours(tickets))} />
        <Kpi label="Avg. first response" value={fmtDuration(avgFirstResponseHours(tickets))} />
        <Kpi label="Reopened" value={reopened.count ?? 0} />
        <Kpi label="Overdue now" value={tickets.filter((t) => isOverdue(t)).length} tone="danger" />
        <Kpi label="Avg. satisfaction" value={rated.length ? `${avg(rated)!.toFixed(1)} / 5` : '—'} icon={<Star className="h-5 w-5" />} />
        <Kpi label="Ratings received" value={rated.length} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets per day</h2><LineChart data={bucket(tickets, 'day', 30)} /></section>
        <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets per week</h2><LineChart data={bucket(tickets, 'week')} color="#6b7fd7" /></section>
        <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets per month</h2><Bars data={bucket(tickets, 'month').map((b) => ({ label: b.label, value: b.value }))} color="#8a9a3b" /></section>
        <section className="card p-4"><h2 className="mb-3 font-semibold">By category</h2><Donut data={topN(countBy(tickets, (t) => t.category_id ?? 'none', { ...cLabel, none: 'Uncategorised' }))} /></section>
        <section className="card p-4"><h2 className="mb-3 font-semibold">By department</h2><Bars data={countBy(tickets, (t) => (t.category_id ? catDept[t.category_id] : null) ?? 'none', { ...dLabel, none: 'No department' })} color="#2f8f83" /></section>
        <section className="card p-4"><h2 className="mb-3 font-semibold">By faculty (assigned)</h2><Bars data={countBy(tickets, (t) => t.assigned_to ?? 'none', { ...names, none: 'Unassigned' }).slice(0, 12)} color="#9a6fb0" /></section>
        <section className="card p-4 lg:col-span-2"><h2 className="mb-3 font-semibold">Student satisfaction</h2>{rated.length ? <Bars data={dist} color="#c0752f" /> : <p className="py-4 text-center text-sm text-muted">No ratings yet — they appear once students confirm resolutions.</p>}</section>
      </div>
    </div>
  );
}
