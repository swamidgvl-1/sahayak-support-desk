import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { createKb, deleteKb } from '@/app/actions';
import { EmptyNote } from '@/components/Empty';

export const metadata = { title: 'Help Centre' };

export default async function KnowledgeBase({ searchParams }: { searchParams: { q?: string } }) {
  const me = await requireProfile();
  const staff = me.role !== 'student';
  const cfg = await getConfig();
  const supabase = supabaseServer();
  const q = (searchParams.q ?? '').replace(/[%,()]/g, ' ').trim();
  let query = supabase.from('kb_articles').select('*').order('created_at');
  if (q) query = query.or(`question.ilike.%${q}%,answer.ilike.%${q}%`);
  const { data } = await query;
  const cName = Object.fromEntries(cfg.categories.map((c) => [c.id, c.name]));
  const groups = new Map<string, any[]>();
  (data ?? []).forEach((a: any) => { const k = cName[a.category_id] ?? 'General'; groups.set(k, [...(groups.get(k) ?? []), a]); });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{staff ? 'Knowledge Base' : 'Help Centre'}</h1>
        <p className="text-sm text-muted">Quick answers to common questions. Can&apos;t find yours? <Link className="text-accent underline" href="/student/new">Raise a ticket</Link>.</p>
      </div>
      <form method="get"><input name="q" defaultValue={q} className="input" type="search" placeholder="Search answers…" aria-label="Search the help centre" /></form>

      {groups.size === 0 && <EmptyNote>No articles found.</EmptyNote>}
      {Array.from(groups, ([name, items]) => (
        <section key={name}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{name}</h2>
          <div className="card divide-y divide-line">
            {items.map((a) => (
              <details key={a.id} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">{a.question}<span className="text-muted group-open:rotate-45">+</span></summary>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{a.answer}</p>
                {staff && <form action={deleteKb} className="mt-2"><input type="hidden" name="id" value={a.id} /><button className="btn btn-sm"><Trash2 className="h-3 w-3" /> Delete</button></form>}
              </details>
            ))}
          </div>
        </section>
      ))}

      {staff && (
        <form action={createKb} className="card space-y-3 p-4">
          <h2 className="font-semibold">Add an article</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="q">Question</label><input id="q" name="question" className="input" required /></div>
            <div><label className="label" htmlFor="c">Category</label><select id="c" name="category_id" className="input"><option value="">General</option>{cfg.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div><label className="label" htmlFor="a">Answer</label><textarea id="a" name="answer" className="input min-h-[90px]" required /></div>
          <button className="btn btn-primary">Publish article</button>
        </form>
      )}
    </div>
  );
}
