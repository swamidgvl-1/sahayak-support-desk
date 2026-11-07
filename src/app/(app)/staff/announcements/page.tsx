import { Trash2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { createAnnouncement, deleteAnnouncement } from '@/app/actions';
import { EmptyNote } from '@/components/Empty';
import { fmtDate } from '@/lib/utils';

export const metadata = { title: 'Announcements' };

export default async function Announcements() {
  await requireProfile(['faculty', 'admin']);
  const { data } = await supabaseServer().from('announcements').select('*').order('created_at', { ascending: false });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Announcements</h1>
      <form action={createAnnouncement} className="card space-y-3 p-4">
        <h2 className="font-semibold">Publish an announcement</h2>
        <div><label className="label" htmlFor="t">Title</label><input id="t" name="title" className="input" required maxLength={150} placeholder="ERP maintenance scheduled for Sunday" /></div>
        <div><label className="label" htmlFor="b">Description</label><textarea id="b" name="body" className="input min-h-[90px]" required maxLength={2000} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="p">Priority</label><select id="p" name="priority" className="input"><option value="normal">Normal</option><option value="important">Important</option></select></div>
          <div><label className="label" htmlFor="e">Expires on (optional)</label><input id="e" name="expires_at" type="date" className="input" /></div>
        </div>
        <button className="btn btn-primary">Publish</button>
      </form>

      {data?.length ? (
        <ul className="space-y-2">
          {data.map((a: any) => {
            const expired = a.expires_at && new Date(a.expires_at) < new Date();
            return (
              <li key={a.id} className="card flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{a.title} {a.priority === 'important' && <span className="badge bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">Important</span>} {expired && <span className="badge bg-stone-200 text-stone-700">Expired</span>}</div>
                  <p className="whitespace-pre-line text-sm text-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-muted">Published {fmtDate(a.created_at, false)}{a.expires_at ? ` · expires ${fmtDate(a.expires_at, false)}` : ''}</p>
                </div>
                <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn btn-sm" aria-label={`Delete ${a.title}`}><Trash2 className="h-4 w-4" /></button></form>
              </li>
            );
          })}
        </ul>
      ) : <EmptyNote>No announcements yet.</EmptyNote>}
    </div>
  );
}
