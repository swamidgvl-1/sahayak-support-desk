import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { queryTickets, type TicketParams } from '@/lib/tickets';
import { FilterBar } from '@/components/FilterBar';
import { StudentTicketList } from '@/components/StudentTicketList';
import { TicketTable } from '@/components/TicketTable';
import { Pagination } from '@/components/Pagination';
import { SavedViews } from '@/components/SavedViews';
import { EmptyNote, EmptyStaff, EmptyStudent } from '@/components/Empty';
import { RealtimeRefresh } from '@/components/ClientBits';
import type { TicketRow } from '@/lib/types';

export const metadata = { title: 'Tickets' };
const PAGE_SIZE = 25;

export default async function TicketsPage({ searchParams }: { searchParams: TicketParams }) {
  const me = await requireProfile();
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const staff = me.role !== 'student';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { data, count, error } = await (await queryTickets(supabase, searchParams, me, { page, pageSize: PAGE_SIZE }));
  const tickets = (data ?? []) as unknown as TicketRow[];
  const hasFilters = Object.keys(searchParams).some((k) => !['page', 'sort', 'dir'].includes(k));

  const statusField = { key: 'status', label: 'Status', options: cfg.statuses.map((s) => ({ value: s.key, label: s.label })) };
  const catField = { key: 'category', label: 'Category', options: cfg.categories.map((c) => ({ value: c.id, label: c.name })) };

  if (!staff) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Tickets</h1>
          <Link href="/student/new" className="btn btn-primary">+ Raise New Ticket</Link>
        </div>
        <RealtimeRefresh table="tickets" filter={`student_id=eq.${me.id}`} />
        <FilterBar placeholder="Search by ticket number, subject or description…" fields={[statusField, catField]} showDates />
        {error && <EmptyNote>Something went wrong while loading your tickets. Please refresh.</EmptyNote>}
        {tickets.length ? <StudentTicketList tickets={tickets} statuses={cfg.statuses} /> : hasFilters ? <EmptyNote>No tickets match your search.</EmptyNote> : <EmptyStudent />}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} params={searchParams} basePath="/tickets" />
      </div>
    );
  }

  const [{ data: staffList }, { data: customViews }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('role', ['faculty', 'admin']).eq('status', 'active').order('full_name'),
    supabase.from('saved_views').select('id, name, query').eq('user_id', me.id).order('created_at'),
  ]);
  const erp = cfg.categories.find((c) => c.name === 'ERP');
  const builtin = [
    { name: 'My Open Tickets', query: 'assignee=me&open=1' },
    { name: 'High Priority', query: 'priority=high,urgent&open=1' },
    ...(erp ? [{ name: 'ERP Issues', query: `category=${erp.id}&open=1` }] : []),
    { name: 'Waiting for Student', query: 'status=waiting_student' },
    { name: 'Waiting for Department', query: 'status=waiting_department' },
    { name: 'Overdue', query: 'sla=overdue' },
    { name: 'Resolved Today', query: 'status=resolved&from=today' },
    { name: 'Unassigned', query: 'assignee=none&open=1' },
  ];
  const exportQs = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== 'page') as [string, string][]).toString();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <a href={`/api/export?${exportQs}`} className="btn btn-sm"><Download className="h-4 w-4" /> Export CSV (Excel)</a>
      </div>
      <RealtimeRefresh table="tickets" />
      <SavedViews builtin={builtin} custom={customViews ?? []} />
      <FilterBar
        placeholder="Search ticket ID, student name, student ID, subject, category, course…"
        showDates
        fields={[
          statusField,
          { key: 'priority', label: 'Priority', options: cfg.priorities.map((p) => ({ value: p.key, label: p.label })) },
          catField,
          { key: 'assignee', label: 'Faculty', options: [{ value: 'me', label: 'Assigned to me' }, { value: 'none', label: 'Unassigned' }, ...(staffList ?? []).map((s: any) => ({ value: s.id, label: s.full_name }))] },
          { key: 'sla', label: 'SLA', options: [{ value: 'overdue', label: 'Overdue' }] },
          { key: 'semester', label: 'Semester', options: ['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => ({ value: s, label: `Sem ${s}` })) },
        ]}
      />
      {error && <EmptyNote>Something went wrong while loading tickets. Please refresh.</EmptyNote>}
      {tickets.length ? (
        <TicketTable tickets={tickets} statuses={cfg.statuses} priorities={cfg.priorities} staffList={staffList ?? []} warnPct={Number(cfg.settings.sla_warning_percent ?? 25)} />
      ) : hasFilters ? <EmptyNote>No tickets match these filters.</EmptyNote> : <EmptyStaff />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} params={searchParams} basePath="/tickets" />
    </div>
  );
}
