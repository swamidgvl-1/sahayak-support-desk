import Link from 'next/link';
import { AlertCircle, CheckCircle2, CircleDot, Clock, Lock, Megaphone, PauseCircle, PlusCircle, Ticket } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { Greeting, RealtimeRefresh } from '@/components/ClientBits';
import { Kpi } from '@/components/Charts';
import { EmptyStudent } from '@/components/Empty';
import { StudentTicketList } from '@/components/StudentTicketList';
import { fmtDate } from '@/lib/utils';
import type { TicketRow } from '@/lib/types';

export const metadata = { title: 'Home' };

export default async function StudentHome() {
  const me = await requireProfile(['student']);
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const [{ data: all }, { data: recent }, { data: ann }, { data: waiting }] = await Promise.all([
    supabase.from('tickets').select('id,status').eq('student_id', me.id),
    supabase.from('tickets').select('*, category:categories(name)').eq('student_id', me.id).order('updated_at', { ascending: false }).limit(8),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('tickets').select('id,ticket_number,subject,status').eq('student_id', me.id).in('status', ['waiting_student', 'resolved']).limit(5),
  ]);

  const kind = Object.fromEntries(cfg.statuses.map((s) => [s.key, s.kind]));
  const n = (k: string) => (all ?? []).filter((t: any) => kind[t.status] === k).length;

  return (
    <div className="space-y-6">
      <RealtimeRefresh table="tickets" filter={`student_id=eq.${me.id}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Greeting name={me.full_name} />
        <Link href="/student/new" className="btn btn-primary hidden md:inline-flex"><PlusCircle className="h-4 w-4" /> Raise New Ticket</Link>
      </div>

      <section aria-label="My tickets" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total Tickets" value={all?.length ?? 0} icon={<Ticket className="h-5 w-5" />} />
        <Kpi label="Open" value={n('open')} icon={<CircleDot className="h-5 w-5" />} />
        <Kpi label="In Progress" value={n('active')} icon={<Clock className="h-5 w-5" />} />
        <Kpi label="Waiting for Response" value={n('waiting')} icon={<PauseCircle className="h-5 w-5" />} />
        <Kpi label="Resolved" value={n('resolved')} icon={<CheckCircle2 className="h-5 w-5" />} tone="good" />
        <Kpi label="Closed" value={n('closed')} icon={<Lock className="h-5 w-5" />} />
      </section>

      {!!waiting?.length && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/40" aria-label="Needs your attention">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4" /> Needs your attention</h2>
          <ul className="space-y-1 text-sm">
            {waiting.map((t: any) => (
              <li key={t.id}>
                <Link href={`/tickets/${t.id}`} className="underline">{t.ticket_number}</Link> — {t.subject}{' '}
                <span className="text-muted">({t.status === 'resolved' ? 'please confirm it is fixed' : 'we need more information from you'})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!ann?.length && (
        <section aria-label="Announcements" className="space-y-2">
          {ann.map((a: any) => (
            <div key={a.id} className="card flex gap-3 p-4">
              <Megaphone className={`mt-0.5 h-5 w-5 shrink-0 ${a.priority === 'important' ? 'text-red-600' : 'text-accent'}`} aria-hidden />
              <div>
                <div className="font-medium">{a.title} {a.priority === 'important' && <span className="badge bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">Important</span>}</div>
                <p className="whitespace-pre-line text-sm text-muted">{a.body}</p>
                <p className="mt-1 text-xs text-muted">{fmtDate(a.created_at, false)}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Tickets</h2>
          <Link href="/tickets" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        {recent?.length ? <StudentTicketList tickets={recent as TicketRow[]} statuses={cfg.statuses} /> : <EmptyStudent />}
      </section>
    </div>
  );
}
