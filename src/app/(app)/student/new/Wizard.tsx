'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Lightbulb, Loader2, Paperclip, X } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { createTicket } from '@/app/actions';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadAttachments, validateFiles, type UploadRules } from '@/lib/upload';
import { cn } from '@/lib/utils';
import type { Category, Priority, Subcategory } from '@/lib/types';

interface Kb { id: string; category_id: string | null; question: string; answer: string }

export function NewTicketWizard({ userId, categories, subcategories, priorities, kb, defaults, rules }: {
  userId: string; categories: Category[]; subcategories: Subcategory[]; priorities: Priority[]; kb: Kb[];
  defaults: { semester: string; academic_year: string }; rules: UploadRules;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState<Category | null>(null);
  const [sub, setSub] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('medium');
  const [more, setMore] = useState(false);
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState(defaults.semester);
  const [year, setYear] = useState(defaults.academic_year);
  const [contact, setContact] = useState('app');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: string; number: string } | null>(null);
  const submitting = useRef(false);

  const subs = useMemo(() => subcategories.filter((s) => s.category_id === cat?.id), [subcategories, cat]);
  const hints = useMemo(() => {
    if (!cat) return [];
    const words = `${subject} ${desc}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return kb
      .filter((k) => k.category_id === cat.id)
      .map((k) => ({ k, score: words.filter((w) => (k.question + ' ' + k.answer).toLowerCase().includes(w)).length }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3).map((x) => x.k);
  }, [kb, cat, subject, desc]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 5);
    const err = validateFiles(next, rules);
    if (err) { setError(err); return; }
    setError(''); setFiles(next);
  }

  async function submit() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    const res = await createTicket({
      category_id: cat!.id, subcategory_id: sub || null, subject, description: desc, priority,
      course, semester, academic_year: year, contact_method: contact,
    });
    if (!res.ok) { setError(res.error); setBusy(false); submitting.current = false; return; }
    if (files.length) {
      const err = await uploadAttachments(supabaseBrowser(), { ticketId: res.id, files, userId });
      if (err) setError(err + ' You can attach it again from the ticket page.');
    }
    setDone({ id: res.id, number: res.ticket_number });
    setBusy(false);
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden />
        <h1 className="text-xl font-semibold">Ticket created successfully.</h1>
        <p className="text-2xl font-bold text-accent">{done.number}</p>
        <p className="text-sm text-muted">You can track the progress of your ticket from My Tickets.</p>
        {error && <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link className="btn btn-primary" href={`/tickets/${done.id}`}>View ticket</Link>
          <Link className="btn" href="/tickets">My Tickets</Link>
        </div>
      </div>
    );
  }

  const stepTitles = ['Category', 'Details', 'Attachments', 'Review'];
  const canNext2 = subject.trim().length >= 3 && desc.trim().length >= 3;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Raise a ticket</h1>
      <ol className="mb-5 flex items-center gap-2 text-xs" aria-label="Progress">
        {stepTitles.map((t, i) => (
          <li key={t} className={cn('flex flex-1 items-center gap-2', i + 1 <= step ? 'text-accent' : 'text-muted')} aria-current={i + 1 === step ? 'step' : undefined}>
            <span className={cn('grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold', i + 1 <= step ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>{i + 1}</span>
            <span className="hidden sm:inline">{t}</span>
            {i < 3 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section>
          <h2 className="mb-3 font-medium">What do you need help with?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => { setCat(c); setSub(''); setStep(2); }}
                className={cn('card flex min-h-[96px] flex-col items-start gap-2 p-4 text-left transition hover:border-accent', cat?.id === c.id && 'border-accent')}>
                <CategoryIcon name={c.icon} className="h-6 w-6 text-accent" />
                <span className="text-sm font-medium leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && cat && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted"><CategoryIcon name={cat.icon} className="h-4 w-4 text-accent" /> {cat.name}</div>
          {subs.length > 0 && (
            <fieldset>
              <legend className="label">What is it about?</legend>
              <div className="flex flex-wrap gap-2">
                {subs.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setSub(s.id); if (!subject) setSubject(s.name); }}
                    className={cn('min-h-[38px] rounded-full border px-3 text-sm', sub === s.id ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:bg-sunken')}>
                    {s.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div>
            <label className="label" htmlFor="subject">Subject</label>
            <input id="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="e.g. Attendance not updated in ERP" />
          </div>
          <div>
            <label className="label" htmlFor="desc">Describe the problem</label>
            <textarea id="desc" className="input min-h-[120px]" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={5000} placeholder="What happened? Which subject or date? What did you expect?" />
          </div>
          {hints.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-950/40">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium"><Lightbulb className="h-4 w-4" /> You may find your answer here.</p>
              {hints.map((h) => (
                <details key={h.id} className="py-1 text-sm"><summary className="cursor-pointer">{h.question}</summary><p className="mt-1 text-muted">{h.answer}</p></details>
              ))}
            </div>
          )}
          <div>
            <span className="label">Priority</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Priority">
              {priorities.map((p) => (
                <button key={p.key} type="button" role="radio" aria-checked={priority === p.key} onClick={() => setPriority(p.key)}
                  className={cn('min-h-[42px] rounded-lg border text-sm', priority === p.key ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:bg-sunken')}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">Please choose honestly — staff may change the priority.</p>
          </div>
          <button type="button" className="text-sm text-accent underline" onClick={() => setMore(!more)}>{more ? 'Hide' : 'Add'} optional details (course, semester, contact method)</button>
          {more && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="course">Related course</label><input id="course" className="input" value={course} onChange={(e) => setCourse(e.target.value)} /></div>
              <div><label className="label" htmlFor="sem">Semester</label><input id="sem" className="input" value={semester} onChange={(e) => setSemester(e.target.value)} /></div>
              <div><label className="label" htmlFor="yr">Academic year</label><input id="yr" className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026-27" /></div>
              <div>
                <label className="label" htmlFor="cm">Preferred contact</label>
                <select id="cm" className="input" value={contact} onChange={(e) => setContact(e.target.value)}>
                  <option value="app">In this app</option><option value="email">Email</option><option value="phone">Phone</option>
                </select>
              </div>
            </div>
          )}
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!canNext2} />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="font-medium">Attach a screenshot or document <span className="text-sm font-normal text-muted">(optional)</span></h2>
          <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center hover:bg-sunken">
            <Paperclip className="h-6 w-6 text-accent" aria-hidden />
            <span className="text-sm font-medium">Tap to take a photo or choose files</span>
            <span className="text-xs text-muted">Images, PDF, Word, Excel · up to {rules.maxMb} MB each · max 5 files</span>
            <input type="file" multiple className="sr-only" accept={rules.allowed.map((e) => '.' + e).join(',')} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          {files.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((f, i) => (
                <li key={f.name + i} className="card relative overflow-hidden p-2 text-xs">
                  {f.type.startsWith('image/')
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={URL.createObjectURL(f)} alt={f.name} className="mb-1 h-24 w-full rounded object-cover" />
                    : <div className="mb-1 grid h-24 place-items-center rounded bg-sunken"><FileText className="h-8 w-8 text-muted" /></div>}
                  <div className="truncate">{f.name}</div>
                  <button className="absolute right-1 top-1 rounded-full bg-surface p-1 shadow" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel={files.length ? 'Continue' : 'Skip'} />
        </section>
      )}

      {step === 4 && cat && (
        <section className="space-y-4">
          <div className="card divide-y divide-line">
            <Row k="Category" v={`${cat.name}${sub ? ' → ' + subs.find((s) => s.id === sub)?.name : ''}`} />
            <Row k="Subject" v={subject} />
            <Row k="Description" v={desc} />
            <Row k="Priority" v={priorities.find((p) => p.key === priority)?.label ?? priority} />
            <Row k="Attachments" v={files.length ? files.map((f) => f.name).join(', ') : 'None'} />
          </div>
          {error && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
          <div className="flex justify-between gap-2">
            <button className="btn" onClick={() => setStep(3)} disabled={busy}><ArrowLeft className="h-4 w-4" /> Back</button>
            <button className="btn btn-primary min-w-[140px]" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit ticket
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="grid gap-1 p-3 sm:grid-cols-[130px_1fr]"><div className="text-xs font-medium text-muted">{k}</div><div className="whitespace-pre-line text-sm">{v}</div></div>;
}

function Nav({ onBack, onNext, disabled, nextLabel = 'Continue' }: { onBack: () => void; onNext: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex justify-between gap-2 pt-2">
      <button type="button" className="btn" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</button>
      <button type="button" className="btn btn-primary" onClick={onNext} disabled={disabled}>{nextLabel}</button>
    </div>
  );
}
