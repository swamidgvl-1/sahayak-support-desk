import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, FileText, Lock, Star } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { TICKET_SELECT } from '@/lib/tickets';
import { PriorityBadge, SlaChip, StatusBadge } from '@/components/Badges';
import { RealtimeRefresh } from '@/components/ClientBits';
import { Composer, StaffPanel, StudentResolution } from './Parts';
import { cn, fmtDate } from '@/lib/utils';

export const metadata = { title: 'Ticket' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STEPS = ['Created', 'Assigned', 'In Progress', 'Waiting', 'Resolved', 'Closed'];

export default async function TicketDetail({ params, searchParams }: { params: { id: string }; searchParams: { resolve?: string } }) {
  if (!UUID.test(params.id)) notFound();
  const me = await requireProfile();
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const staff = me.role !== 'student';

  // Row-level security guarantees a student only ever gets their own ticket here; anything else is a 404.
  const { data: t } = await supabase.from('tickets').select(TICKET_SELECT + ', subcategory:subcategories(name)').eq('id', params.id).maybeSingle();
  if (!t) notFound();
  const ticket = t as any;

  const [{ data: messages }, { data: atts }, studentRes, staffRes, histRes] = await Promise.all([
    supabase.from('ticket_messages').select('*, sender:profiles!ticket_messages_sender_id_fkey(full_name, role)').eq('ticket_id', ticket.id).order('created_at'),
    supabase.from('attachments').select('*').eq('ticket_id', ticket.id).order('created_at'),
    staff ? supabase.from('student_details').select('*').eq('user_id', ticket.student_id).maybeSingle() : Promise.resolve({ data: null }),
    staff ? supabase.from('profiles').select('id, full_name').in('role', ['faculty', 'admin']).eq('status', 'active').order('full_name') : Promise.resolve({ data: [] as any[] }),
    staff ? supabase.from('assignments').select('*, to_p:profiles!assignments_assigned_to_fkey(full_name), from_p:profiles!assignments_assigned_from_fkey(full_name), by_p:profiles!assignments_assigned_by_fkey(full_name)').eq('ticket_id', ticket.id).order('assigned_at') : Promise.resolve({ data: [] as any[] }),
  ]);

  const paths = (atts ?? []).map((a: any) => a.path);
  const signed = paths.length ? (await supabase.storage.from('ticket-files').createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlByPath = Object.fromEntries(signed.map((s: any) => [s.path, s.signedUrl]));
  const attsFor = (mid: string | null) => (atts ?? []).filter((a: any) => (a.message_id ?? null) === mid);

  const sm = Object.fromEntries(cfg.statuses.map((s) => [s.key, s]));
  const pm = Object.fromEntries(cfg.priorities.map((p) => [p.key, p]));
  const kind = sm[ticket.status]?.kind ?? 'open';
  const stepIdx = kind === 'closed' ? 5 : kind === 'resolved' ? 4 : kind === 'waiting' ? 3 : kind === 'active' ? 2 : ticket.assigned_to && ticket.status !== 'reopened' ? 1 : 0;
  const rules = {
    maxMb: Number(cfg.settings.max_file_mb ?? 10),
    allowed: (cfg.settings.allowed_file_types as string[]) ?? ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
  };
  const sd: any = studentRes.data;

  const AttList = ({ items }: { items: any[] }) =>
    items.length ? (
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((a) => {
          const url = urlByPath[a.path];
          const isImg = (a.file_type ?? '').startsWith('image') || /\.(png|jpe?g|webp)$/i.test(a.file_name);
          return (
            <li key={a.id}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-line bg-surface text-xs">
                {isImg && url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={url} alt={a.file_name} className="h-24 w-32 object-cover" />
                  : <span className="flex h-24 w-32 flex-col items-center justify-center gap-1 p-2 text-center"><FileText className="h-6 w-6 text-muted" /><span className="line-clamp-2 break-all">{a.file_name}</span></span>}
              </a>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div className="space-y-5">
      <RealtimeRefresh table="ticket_messages" filter={`ticket_id=eq.${ticket.id}`} />
      <RealtimeRefresh table="tickets" filter={`id=eq.${ticket.id}`} />
      <Link href="/tickets" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> {staff ? 'All tickets' : 'My tickets'}</Link>

      <header className="card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent">{ticket.ticket_number}</p>
            <h1 className="text-xl font-semibold md:text-2xl">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} label={sm[ticket.status]?.label} kind={kind} />
            <PriorityBadge priority={ticket.priority} label={pm[ticket.priority]?.label} />
            {staff && <SlaChip ticket={ticket} warnPct={Number(cfg.settings.sla_warning_percent ?? 25)} />}
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-6 gap-1 text-center text-[11px] md:text-xs" aria-label="Ticket progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === stepIdx ? 'step' : undefined} className={cn(i <= stepIdx ? 'text-accent' : 'text-muted')}>
              <div className={cn('mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full border text-[11px]', i < stepIdx && 'border-accent bg-accent text-accent-ink', i === stepIdx && 'border-accent ring-2 ring-accent/30 font-bold', i > stepIdx && 'border-line')}>
                {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {s}
            </li>
          ))}
        </ol>
        {ticket.status === 'reopened' && <p className="mt-3 text-center text-xs text-amber-700 dark:text-amber-300">This ticket was reopened because the issue still exists.</p>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3" aria-label="Conversation">
          <div className="card p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span><strong className="text-ink">{ticket.student?.full_name}</strong> · Student</span><span>{fmtDate(ticket.created_at)}</span>
            </div>
            <p className="whitespace-pre-line text-sm">{ticket.description}</p>
            <AttList items={attsFor(null)} />
          </div>

          {(messages ?? []).map((m: any) => {
            if (m.kind === 'system') return <p key={m.id} className="py-1 text-center text-xs text-muted">{m.body} · {fmtDate(m.created_at)}</p>;
            const mine = m.sender_id === me.id;
            const internal = m.kind === 'internal';
            const senderStaff = m.sender?.role && m.sender.role !== 'student';
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[92%] rounded-2xl border p-3 text-sm md:max-w-[80%]',
                  internal ? 'border-dashed border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                    : senderStaff ? 'border-line bg-sunken' : 'border-accent/30 bg-accent/10')}>
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    {internal && <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-200"><Lock className="h-3 w-3" /> Internal note — not visible to student</span>}
                    <strong className="text-ink">{m.sender?.full_name ?? 'System'}</strong>
                    <span className="capitalize">{m.sender?.role === 'faculty' ? 'Faculty' : m.sender?.role ?? ''}</span>
                    <span>{fmtDate(m.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-line">{m.body === '(attachment)' ? '' : m.body}</p>
                  <AttList items={attsFor(m.id)} />
                </div>
              </div>
            );
          })}

          {!staff && ticket.status === 'resolved' && <StudentResolution ticketId={ticket.id} />}
          {ticket.status === 'closed' && (
            <div className="card p-4 text-center text-sm text-muted">
              This ticket is closed.{ticket.rating ? <> You rated it <Star className="inline h-4 w-4 fill-amber-400 text-amber-400" /> {ticket.rating}/5.</> : null}
              {!staff && <> Still stuck? <Link className="text-accent underline" href="/student/new">Raise a new ticket</Link>.</>}
            </div>
          )}
          {ticket.status !== 'closed' && <Composer ticketId={ticket.id} userId={me.id} isStaff={staff} rules={rules} />}
        </section>

        <aside className="space-y-4">
          {staff && (
            <StaffPanel
              ticket={{ id: ticket.id, status: ticket.status, priority: ticket.priority, assigned_to: ticket.assigned_to, tags: ticket.tags ?? [] }}
              statuses={cfg.statuses} priorities={cfg.priorities} staffList={staffRes.data ?? []} openResolve={searchParams.resolve === '1'}
            />
          )}
          <dl className="card grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 p-4 text-sm">
            <Dt>Student</Dt><dd>{ticket.student?.full_name}</dd>
            {staff && <><Dt>Student ID</Dt><dd>{sd?.student_code ?? '—'}</dd><Dt>Email</Dt><dd className="break-all">{ticket.student?.email}</dd>
              <Dt>Program</Dt><dd>{[sd?.program, sd?.semester ? `Sem ${sd.semester}` : null, sd?.division ? `Div ${sd.division}` : null].filter(Boolean).join(' · ') || '—'}</dd></>}
            <Dt>Course</Dt><dd>{ticket.course ?? '—'}</dd>
            <Dt>Category</Dt><dd>{ticket.category?.name ?? '—'}{ticket.subcategory?.name ? ` → ${ticket.subcategory.name}` : ''}</dd>
            <Dt>Assigned to</Dt><dd>{ticket.assignee?.full_name ?? 'Not yet assigned'}</dd>
            <Dt>Created</Dt><dd>{fmtDate(ticket.created_at)}</dd>
            <Dt>Last updated</Dt><dd>{fmtDate(ticket.updated_at)}</dd>
            {ticket.tags?.length > 0 && <><Dt>Tags</Dt><dd className="flex flex-wrap gap-1">{ticket.tags.map((x: string) => <span key={x} className="badge bg-sunken">{x}</span>)}</dd></>}
            {ticket.resolution && <><Dt>Resolution</Dt><dd>{ticket.resolution}</dd></>}
          </dl>
          {staff && (histRes.data?.length ?? 0) > 0 && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 font-semibold">Assignment history</h2>
              <ul className="space-y-2">
                {histRes.data!.map((h: any) => (
                  <li key={h.id} className="text-xs text-muted">
                    <span className="text-ink">{h.from_p?.full_name ?? 'Unassigned'} → {h.to_p?.full_name ?? 'Unassigned'}</span><br />
                    {fmtDate(h.assigned_at)}{h.by_p?.full_name ? ` · by ${h.by_p.full_name}` : ' · automatic'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-xs font-medium text-muted">{children}</dt>;
}
