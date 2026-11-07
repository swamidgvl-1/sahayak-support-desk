'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bookmark, X } from 'lucide-react';
import { deleteView, saveView } from '@/app/actions';
import { toast } from '@/lib/toast';

export function SavedViews({ builtin, custom }: { builtin: { name: string; query: string }[]; custom: { id: string; name: string; query: string }[] }) {
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const current = (() => { const n = new URLSearchParams(sp.toString()); ['page', 'sort', 'dir'].forEach((k) => n.delete(k)); return n.toString(); })();

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Saved views">
      <Link href="/tickets" className={`btn btn-sm ${current === '' ? 'btn-primary' : ''}`}>All</Link>
      {builtin.map((v) => (
        <Link key={v.name} href={`/tickets?${v.query}`} className={`btn btn-sm ${current === v.query ? 'btn-primary' : ''}`}>{v.name}</Link>
      ))}
      {custom.map((v) => (
        <span key={v.id} className={`btn btn-sm !gap-1 !pr-1 ${current === v.query ? 'btn-primary' : ''}`}>
          <Link href={`/tickets?${v.query}`}>{v.name}</Link>
          <button aria-label={`Delete view ${v.name}`} disabled={pending} onClick={() => start(async () => { await deleteView(v.id); })}><X className="h-3 w-3" /></button>
        </span>
      ))}
      {current && !naming && <button className="btn btn-sm" onClick={() => setNaming(true)}><Bookmark className="h-3 w-3" /> Save this view</button>}
      {naming && (
        <form className="flex gap-1" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveView(name, current);
            if (r.ok) { toast('View saved', 'success'); setNaming(false); setName(''); } else toast(r.error, 'error');
          });
        }}>
          <input className="input !min-h-[34px] !w-40 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" autoFocus maxLength={40} />
          <button className="btn btn-sm btn-primary" disabled={pending}>Save</button>
        </form>
      )}
    </div>
  );
}
