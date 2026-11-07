import Link from 'next/link';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { fmtDate, timeAgo } from '@/lib/utils';
import type { Status, TicketRow } from '@/lib/types';

export function StudentTicketList({ tickets, statuses }: { tickets: TicketRow[]; statuses: Status[] }) {
  const meta = Object.fromEntries(statuses.map((s) => [s.key, s]));
  return (
    <>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>{['Ticket', 'Category', 'Subject', 'Status', 'Created', 'Updated'].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-sunken">
                <td className="td whitespace-nowrap font-medium"><Link href={`/tickets/${t.id}`} className="text-accent hover:underline">{t.ticket_number}</Link></td>
                <td className="td">{t.category?.name ?? '—'}</td>
                <td className="td max-w-[320px] truncate"><Link href={`/tickets/${t.id}`}>{t.subject}</Link></td>
                <td className="td"><StatusBadge status={t.status} label={meta[t.status]?.label} kind={meta[t.status]?.kind} /></td>
                <td className="td whitespace-nowrap text-muted">{fmtDate(t.created_at, false)}</td>
                <td className="td whitespace-nowrap text-muted">{timeAgo(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/tickets/${t.id}`} className="card block p-4 active:bg-sunken">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-accent">{t.ticket_number}</span>
                <StatusBadge status={t.status} label={meta[t.status]?.label} kind={meta[t.status]?.kind} />
              </div>
              <div className="font-medium">{t.subject}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{t.category?.name ?? '—'}</span>
                <span>Updated {timeAgo(t.updated_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export { PriorityBadge };
