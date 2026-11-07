import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDot, Clock, PauseCircle, Ticket, Timer, UserX } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { Bars, Donut, Kpi, LineChart } from '@/components/Charts';
import { PriorityBadge, SlaChip, StatusBadge } from '@/components/Badges';
import { EmptyStaff } from '@/components/Empty';
import { RealtimeRefresh } from '@/components/ClientBits';
import { avgResolutionHours, bucket, countBy, fetchTickets, isOverdue, topN } from '@/lib/analytics';
import { fmtDuration, timeAgo } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

export default async function StaffDashboard() {
  const me = await requireProfile(['faculty', 'admin']);
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const [tickets, { data: staffList }, { data: urgent }] = await Promise.all([
    fetchTickets(supabase),
    supabase.from('profiles').select('id, full_name').in('role', ['faculty', 'admin']),
    supabase.from('tickets')
      .select('id, ticket_number, subject, priority, status, created_at, sla_deadline, first_response_at, assignee:profiles!tickets_assigned_to_fkey(full_name), student:profiles!tickets_student_id_fkey(full_name)')
      .in('priority', ['high', 'urgent']).not('status', 'in', '(resolved,closed)').order('sla_deadline').limit(8),
  ]);

  const kind = Object.fromEntries(cfg.statuses.map((s) => [s.key, s.kind]));
  const sLabel = Object.fromEntries(cfg.statuses.map((s) => [s.key, s.label]));
  const cLabel = Object.fromEntries(cfg.categories.map((c) => [c.id, c.name]));
  const names = Object.fromEntries((staffList ?? []).map((s: any) => [s.id, s.full_name]));
  const openT = tickets.filter((t) => kind[t.status] !== 'resolved' && kind[t.status] !== 'closed');
  const overdue = tickets.filter((t) => isOverdue(t));
  const mine = openT.filter((t) => t.assigned_to === me.id).length;
  const unassigned = openT.filter((t) => !t.assigned_to).length;

  const byStatus = countBy(tickets, (t) => t.status, sLabel);
  const byCat = topN(countBy(tickets, (t) => t.category_id ?? 'none', { ...cLabel, none: 'Uncategorised' }));
  const pending = countBy(openT, (t) => t.assigned_to ?? 'none', { ...names, none: 'Unassigned' }).slice(0, 8);
  const trend = bucket(tickets, 'day', 14);
  const n = (k: string) => tickets.filter((t) => t.status === k).length;
  const nk = (k: string) => tickets.filter((t) => kind[t.status] === k).length;

  return (
    <div className="space-y-6">
      <RealtimeRefresh table="tickets" />
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">{mine} assigned to you · {unassigned} unassigned · {overdue.length} overdue</p>
      </div>

      {!tickets.length ? <EmptyStaff /> : (
        <>
          <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Link href="/tickets"><Kpi label="Total Tickets" value={tickets.length} icon={<Ticket className="h-5 w-5" />} /></Link>
            <Link href="/tickets?status=open,reopened"><Kpi label="New Tickets" value={n('open') + n('reopened')} icon={<CircleDot className="h-5 w-5" />} /></Link>
            <Link href="/tickets?status=in_progress,assigned"><Kpi label="In Progress" value={n('in_progress') + n('assigned')} icon={<Clock className="h-5 w-5" />} /></Link>
            <Link href="/tickets?status=waiting_student"><Kpi label="Waiting for Student" value={n('waiting_student')} icon={<PauseCircle className="h-5 w-5" />} /></Link>
            <Link href="/tickets?status=waiting_department"><Kpi label="Waiting for Department" value={n('waiting_department')} icon={<PauseCircle className="h-5 w-5" />} /></Link>
            <Link href="/tickets?status=resolved"><Kpi label="Resolved" value={nk('resolved')} icon={<CheckCircle2 className="h-5 w-5" />} tone="good" /></Link>
            <Link href="/tickets?sla=overdue"><Kpi label="Overdue" value={overdue.length} icon={<AlertTriangle className="h-5 w-5" />} tone={overdue.length ? 'danger' : undefined} /></Link>
            <Kpi label="Avg. Resolution Time" value={fmtDuration(avgResolutionHours(tickets))} icon={<Timer className="h-5 w-5" />} />
          </section>

          <section className="card p-4" aria-label="High priority tickets">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-red-600" /> High Priority Tickets</h2>
              <Link href="/tickets?priority=high,urgent&open=1" className="text-sm text-accent hover:underline">View all</Link>
            </div>
            {urgent?.length ? (
              <ul className="divide-y divide-line">
                {urgent.map((t: any) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/tickets/${t.id}`} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.ticket_number} · {t.subject}</div>
                      <div className="text-xs text-muted">{t.student?.full_name} · {t.assignee?.full_name ?? 'Unassigned'} · {timeAgo(t.created_at)}</div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} label={sLabel[t.status]} kind={kind[t.status]} />
                      <SlaChip ticket={t} warnPct={Number(cfg.settings.sla_warning_percent ?? 25)} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-center text-sm text-muted">No high-priority tickets waiting.</p>}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets by Category</h2><Donut data={byCat} /></section>
            <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets by Status</h2><Bars data={byStatus} /></section>
            <section className="card p-4"><h2 className="mb-3 font-semibold">Tickets Over Time <span className="text-xs font-normal text-muted">(last 14 days)</span></h2><LineChart data={trend} /></section>
            <section className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">Pending Tickets by Faculty {unassigned > 0 && <span className="badge bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"><UserX className="h-3 w-3" /> {unassigned} unassigned</span>}</h2>
              <Bars data={pending} color="#6b7fd7" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
