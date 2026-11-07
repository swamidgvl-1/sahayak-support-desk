'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, Loader2, MessageSquare } from 'lucide-react';
import { PriorityBadge, SlaChip, StatusBadge } from '@/components/Badges';
import { bulkUpdate, staffUpdateTicket } from '@/app/actions';
import { fmtDate, timeAgo } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { Priority, Status, TicketRow } from '@/lib/types';

interface StaffOpt { id: string; full_name: string }

export function TicketTable({ tickets, statuses, priorities, staffList, warnPct }: {
  tickets: TicketRow[]; statuses: Status[]; priorities: Priority[]; staffList: StaffOpt[]; warnPct: number;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const sm = Object.fromEntries(statuses.map((s) => [s.key, s]));
  const pm = Object.fromEntries(priorities.map((p) => [p.key, p]));
  const allSelected = tickets.length > 0 && sel.length === tickets.length;

  function sortHref(col: string) {
    const n = new URLSearchParams(sp.toString());
    const same = (n.get('sort') ?? 'updated_at') === col;
    n.set('sort', col);
    n.set('dir', same && n.get('dir') !== 'asc' ? 'asc' : 'desc');
    return `${path}?${n.toString()}`;
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const r = await fn();
      if (r.ok) { toast(okMsg, 'success'); setSel([]); router.refresh(); } else toast(r.error ?? 'Something went wrong.', 'error');
    });
  }

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const rowActions = (t: TicketRow) => (
    <div className="flex items-center gap-1">
      <Link href={`/tickets/${t.id}`} className="btn btn-sm" aria-label={`Reply to ${t.ticket_number}`}><MessageSquare className="h-3 w-3" /> Reply</Link>
      <Link href={`/tickets/${t.id}?resolve=1`} className="btn btn-sm">Resolve</Link>
      {t.status === 'resolved' && <button className="btn btn-sm" disabled={pending} onClick={() => run(() => staffUpdateTicket(t.id, { status: 'closed' }), 'Ticket closed')}>Close</button>}
      {(t.status === 'resolved' || t.status === 'closed') && <button className="btn btn-sm" disabled={pending} onClick={() => run(() => staffUpdateTicket(t.id, { status: 'reopened' }), 'Ticket reopened')}>Reopen</button>}
    </div>
  );

  const assignSelect = (t: TicketRow) => (
    <select className="input !min-h-[34px] !py-0 text-xs" value={t.assigned_to ?? ''} disabled={pending} aria-label={`Assign ${t.ticket_number}`}
      onChange={(e) => run(() => staffUpdateTicket(t.id, { assigned_to: e.target.value || null }), 'Assigned')}>
      <option value="">Unassigned</option>
      {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
    </select>
  );

  return (
    <div>
      {sel.length > 0 && (
        <div className="card sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 border-accent p-3 text-sm" role="region" aria-label="Bulk actions">
          <strong>{sel.length} selected</strong>
          <select className="input !min-h-[36px] !w-auto" defaultValue="" onChange={(e) => e.target.value && run(() => bulkUpdate(sel, { assigned_to: e.target.value === '__none' ? null : e.target.value }), 'Assigned')} aria-label="Bulk assign">
            <option value="">Assign to…</option>
            <option value="__none">Unassigned</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select className="input !min-h-[36px] !w-auto" defaultValue="" onChange={(e) => e.target.value && run(() => bulkUpdate(sel, { status: e.target.value }), 'Status updated')} aria-label="Bulk status">
            <option value="">Set status…</option>
            {statuses.filter((s) => s.key !== 'resolved').map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => setSel([])}>Clear</button>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b border-line">
            <tr>
              <th className="th w-8"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSel(allSelected ? [] : tickets.map((t) => t.id))} /></th>
              {['Ticket', 'Student', 'Category', 'Subject', 'Priority', 'Assigned to', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}
              <th className="th"><Link href={sortHref('created_at')} className="inline-flex items-center gap-1">Created <ArrowDownUp className="h-3 w-3" /></Link></th>
              <th className="th"><Link href={sortHref('updated_at')} className="inline-flex items-center gap-1">Updated <ArrowDownUp className="h-3 w-3" /></Link></th>
              <th className="th"><Link href={sortHref('sla_deadline')} className="inline-flex items-center gap-1">SLA <ArrowDownUp className="h-3 w-3" /></Link></th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tickets.map((t) => (
              <tr key={t.id} className="align-middle hover:bg-sunken">
                <td className="td"><input type="checkbox" aria-label={`Select ${t.ticket_number}`} checked={sel.includes(t.id)} onChange={() => toggle(t.id)} /></td>
                <td className="td whitespace-nowrap font-medium"><Link href={`/tickets/${t.id}`} className="text-accent hover:underline">{t.ticket_number}</Link></td>
                <td className="td whitespace-nowrap">{t.student?.full_name ?? '—'}</td>
                <td className="td whitespace-nowrap">{t.category?.name ?? '—'}</td>
                <td className="td max-w-[240px] truncate" title={t.subject}>{t.subject}</td>
                <td className="td"><PriorityBadge priority={t.priority} label={pm[t.priority]?.label} /></td>
                <td className="td min-w-[150px]">{assignSelect(t)}</td>
                <td className="td"><StatusBadge status={t.status} label={sm[t.status]?.label} kind={sm[t.status]?.kind} /></td>
                <td className="td whitespace-nowrap text-muted">{fmtDate(t.created_at, false)}</td>
                <td className="td whitespace-nowrap text-muted">{timeAgo(t.updated_at)}</td>
                <td className="td"><SlaChip ticket={t} warnPct={warnPct} /></td>
                <td className="td">{rowActions(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {tickets.map((t) => (
          <li key={t.id} className="card p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-accent">
                <input type="checkbox" checked={sel.includes(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.ticket_number}`} />
                {t.ticket_number}
              </label>
              <SlaChip ticket={t} warnPct={warnPct} />
            </div>
            <Link href={`/tickets/${t.id}`} className="block font-medium">{t.subject}</Link>
            <div className="mt-1 text-xs text-muted">{t.student?.full_name} · {t.category?.name} · {timeAgo(t.updated_at)}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={t.status} label={sm[t.status]?.label} kind={sm[t.status]?.kind} />
              <PriorityBadge priority={t.priority} label={pm[t.priority]?.label} />
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">{assignSelect(t)}{rowActions(t)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
