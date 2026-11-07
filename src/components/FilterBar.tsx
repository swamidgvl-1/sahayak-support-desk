'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export interface FilterField { key: string; label: string; options: { value: string; label: string }[] }

/** Debounced search + instant filters, all stored in the URL so views can be shared and saved. */
export function FilterBar({ fields, placeholder, showDates }: { fields: FilterField[]; placeholder: string; showDates?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setQ(sp.get('q') ?? ''), [sp]);

  function push(next: URLSearchParams) {
    next.delete('page');
    const s = next.toString();
    router.replace(s ? `${path}?${s}` : path);
  }
  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    push(next);
  }
  function onSearch(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set('q', v.trim()), 350);
  }
  const active = Array.from(sp.keys()).some((k) => !['page', 'sort', 'dir'].includes(k));

  return (
    <div className="card mb-4 space-y-3 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input className="input pl-9" type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label="Search tickets" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
        {fields.map((f) => (
          <label key={f.key} className="text-xs text-muted">
            <span className="sr-only">{f.label}</span>
            <select className="input" value={sp.get(f.key) ?? ''} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label}>
              <option value="">{f.label}: All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        ))}
        {showDates && (
          <>
            <label className="text-xs text-muted">From<input type="date" className="input" value={sp.get('from') && sp.get('from') !== 'today' ? sp.get('from')! : ''} onChange={(e) => set('from', e.target.value)} /></label>
            <label className="text-xs text-muted">To<input type="date" className="input" value={sp.get('to') ?? ''} onChange={(e) => set('to', e.target.value)} /></label>
          </>
        )}
      </div>
      {active && (
        <button className="btn btn-sm" onClick={() => { setQ(''); router.replace(path); }}><X className="h-3 w-3" /> Clear filters</button>
      )}
    </div>
  );
}
