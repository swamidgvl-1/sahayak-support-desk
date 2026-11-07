import { supabaseServer } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/utils';
import { EmptyNote } from '@/components/Empty';

export const metadata = { title: 'Audit log' };

function sentence(a: any) {
  const who = a.user?.full_name ?? 'System';
  const m = a.metadata ?? {};
  switch (a.action) {
    case 'ticket.status': return `${who} changed ${a.entity_id} from ${m.from} → ${m.to}.`;
    case 'ticket.priority': return `${who} changed priority of ${a.entity_id} from ${m.from} → ${m.to}.`;
    case 'ticket.assign': return `${who} assigned ${a.entity_id}.`;
    case 'ticket.create': return `${who} created ${a.entity_id} (${m.priority ?? ''} priority).`;
    case 'ticket.reply': return `${who} replied on ${a.entity_id}.`;
    case 'auth.login': return `${who} signed in.`;
    case 'user.create': return `${who} created user ${a.entity_id}.`;
    case 'user.update': return `${who} modified a user: ${JSON.stringify(m)}.`;
    case 'user.import': return `${who} imported ${a.entity_id} students.`;
    case 'export.tickets': return `${who} exported ${a.entity_id} tickets.`;
    default: return `${who}: ${a.action} ${a.entity ?? ''} ${a.entity_id ?? ''}`.trim();
  }
}

export default async function Audit({ searchParams }: { searchParams: { type?: string } }) {
  let q = supabaseServer().from('audit_logs').select('*, user:profiles!audit_logs_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(200);
  if (searchParams.type) q = q.like('action', `${searchParams.type}%`);
  const { data } = await q;
  const types = [['', 'Everything'], ['auth', 'Logins'], ['ticket', 'Tickets'], ['user', 'Users'], ['config', 'Configuration'], ['export', 'Exports']];
  return (
    <div>
      <form className="mb-3 flex gap-2" method="get">
        <select name="type" defaultValue={searchParams.type ?? ''} className="input !w-auto" aria-label="Filter by type">{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="btn">Filter</button>
      </form>
      {data?.length ? (
        <ul className="card divide-y divide-line">
          {data.map((a: any) => (
            <li key={a.id} className="p-3 text-sm">
              <div className="text-xs text-muted">{fmtDate(a.created_at)}</div>
              {sentence(a)}
            </li>
          ))}
        </ul>
      ) : <EmptyNote>No activity recorded yet.</EmptyNote>}
      <p className="mt-2 text-xs text-muted">Showing the latest 200 events.</p>
    </div>
  );
}
