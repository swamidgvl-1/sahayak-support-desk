'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Paperclip, Send, Star, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { postMessage, resolveTicket, staffUpdateTicket, studentRespond } from '@/app/actions';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadAttachments, validateFiles, type UploadRules } from '@/lib/upload';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Priority, Status } from '@/lib/types';

export function Composer({ ticketId, userId, isStaff, rules }: { ticketId: string; userId: string; isStaff: boolean; rules: UploadRules }) {
  const router = useRouter();
  const [mode, setMode] = useState<'reply' | 'internal'>('reply');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const internal = mode === 'internal';

  async function send() {
    if (lock.current || (!text.trim() && !files.length)) return;
    lock.current = true; setBusy(true);
    const body = text.trim() || (files.length ? '(attachment)' : '');
    const r = await postMessage(ticketId, body, mode);
    if (!r.ok) { toast(r.error, 'error'); lock.current = false; setBusy(false); return; }
    if (files.length) {
      const err = await uploadAttachments(supabaseBrowser(), { ticketId, messageId: r.id, files, userId });
      if (err) toast(err, 'error');
    }
    setText(''); setFiles([]); lock.current = false; setBusy(false);
    toast(internal ? 'Internal note added' : 'Message sent', 'success');
    router.refresh();
  }

  function pick(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 5);
    const err = validateFiles(next, rules);
    if (err) toast(err, 'error'); else setFiles(next);
  }

  return (
    <div className={cn('card p-3', internal && 'border-dashed border-amber-500 bg-amber-50/60 dark:bg-amber-950/30')}>
      {isStaff && (
        <div className="mb-2 inline-flex rounded-lg bg-sunken p-1 text-sm" role="tablist">
          <button role="tab" aria-selected={!internal} className={cn('min-h-[34px] rounded-md px-3', !internal && 'bg-surface shadow-sm')} onClick={() => setMode('reply')}>Reply to student</button>
          <button role="tab" aria-selected={internal} className={cn('flex min-h-[34px] items-center gap-1 rounded-md px-3', internal && 'bg-amber-200 text-amber-950')} onClick={() => setMode('internal')}><Lock className="h-3 w-3" /> Internal note</button>
        </div>
      )}
      {internal && <p className="mb-2 text-xs text-amber-800 dark:text-amber-200">Only faculty and admins can see internal notes. The student will never see this.</p>}
      <label className="sr-only" htmlFor="composer">{internal ? 'Internal note' : 'Your message'}</label>
      <textarea id="composer" className="input min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={internal ? 'Write a private note for the team…' : 'Write a message…'} maxLength={5000} />
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {files.map((f, i) => (
            <li key={f.name + i} className="flex items-center gap-1 rounded-full bg-sunken px-2 py-1">{f.name}
              <button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button></li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center justify-between">
        <label className="btn btn-sm cursor-pointer">
          <Paperclip className="h-4 w-4" /> Attach
          <input type="file" multiple className="sr-only" accept={rules.allowed.map((e) => '.' + e).join(',')} onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
        </label>
        <button className={cn('btn btn-primary', internal && '!bg-amber-600')} onClick={send} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {internal ? 'Save note' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export function StaffPanel({ ticket, statuses, priorities, staffList, openResolve }: {
  ticket: { id: string; status: string; priority: string; assigned_to: string | null; tags: string[] };
  statuses: Status[]; priorities: Priority[]; staffList: { id: string; full_name: string }[]; openResolve: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resolveOpen, setResolveOpen] = useState(openResolve);
  const [resolution, setResolution] = useState('');
  const [tags, setTags] = useState(ticket.tags.join(', '));
  const closed = ticket.status === 'closed';

  function update(patch: Parameters<typeof staffUpdateTicket>[1], msg: string) {
    start(async () => {
      const r = await staffUpdateTicket(ticket.id, patch);
      if (r.ok) { toast(msg, 'success'); router.refresh(); } else toast(r.error, 'error');
    });
  }

  return (
    <div className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold">Manage ticket {pending && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</h2>
      <div>
        <label className="label" htmlFor="assign">Assigned to</label>
        <select id="assign" className="input" value={ticket.assigned_to ?? ''} disabled={pending} onChange={(e) => update({ assigned_to: e.target.value || null }, 'Assignment updated')}>
          <option value="">Unassigned</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="st">Status</label>
          <select id="st" className="input" value={ticket.status} disabled={pending} onChange={(e) => update({ status: e.target.value }, 'Status updated')}>
            {statuses.map((s) => <option key={s.key} value={s.key} disabled={s.key === 'resolved'}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pr">Priority</label>
          <select id="pr" className="input" value={ticket.priority} disabled={pending} onChange={(e) => update({ priority: e.target.value }, 'Priority updated')}>
            {priorities.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)}
          onBlur={() => tags !== ticket.tags.join(', ') && update({ tags: tags.split(',') }, 'Tags saved')} placeholder="e.g. sync-issue, urgent-exam" />
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {ticket.status !== 'resolved' && !closed && <button className="btn btn-primary btn-sm" onClick={() => setResolveOpen(true)}>Resolve ticket</button>}
        {ticket.status === 'resolved' && <button className="btn btn-sm" disabled={pending} onClick={() => update({ status: 'closed' }, 'Ticket closed')}>Close ticket</button>}
        {(ticket.status === 'resolved' || closed) && <button className="btn btn-sm" disabled={pending} onClick={() => update({ status: 'reopened' }, 'Ticket reopened')}>Reopen</button>}
      </div>

      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve ticket">
        <label className="label" htmlFor="res">Resolution description (the student will see this)</label>
        <textarea id="res" className="input min-h-[110px]" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Attendance has been updated in ERP." autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setResolveOpen(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={pending || resolution.trim().length < 3} onClick={() => start(async () => {
            const r = await resolveTicket(ticket.id, resolution);
            if (r.ok) { toast('Ticket resolved — the student has been notified', 'success'); setResolveOpen(false); setResolution(''); router.replace(`/tickets/${ticket.id}`); router.refresh(); } else toast(r.error, 'error');
          })}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Resolve ticket
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function StudentResolution({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  function submit(action: 'confirm' | 'reopen') {
    start(async () => {
      const r = await studentRespond(ticketId, action, action === 'confirm' ? rating || undefined : undefined, comment);
      if (r.ok) { toast(action === 'confirm' ? 'Thank you! Ticket closed.' : 'Ticket reopened.', 'success'); router.refresh(); } else toast(r.error, 'error');
    });
  }

  return (
    <div className="card border-green-400 bg-green-50/60 p-4 dark:border-green-500/40 dark:bg-green-950/30">
      <h2 className="font-semibold">Was your issue resolved?</h2>
      <p className="mb-3 text-sm text-muted">If you do nothing, this ticket will close automatically after a few days.</p>
      {!answer && (
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setAnswer('yes')}>Yes</button>
          <button className="btn" onClick={() => setAnswer('no')}>No</button>
        </div>
      )}
      {answer === 'yes' && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm">How satisfied are you?</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-1">
                  <Star className={cn('h-7 w-7', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
                </button>
              ))}
            </div>
          </div>
          <textarea className="input min-h-[70px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us about your experience. (optional)" maxLength={1000} />
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending} onClick={() => submit('confirm')}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm resolution</button>
            <button className="btn" onClick={() => setAnswer(null)}>Back</button>
          </div>
        </div>
      )}
      {answer === 'no' && (
        <div className="space-y-3">
          <textarea className="input min-h-[90px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What is still not working?" maxLength={2000} />
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending} onClick={() => submit('reopen')}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Reopen ticket</button>
            <button className="btn" onClick={() => setAnswer(null)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
