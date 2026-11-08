'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { adminDelete, adminSave } from '@/app/actions';
import { toast } from '@/lib/toast';

export interface Col {
  key: string;
  label: string;
  type: 'text' | 'number' | 'bool' | 'select' | 'json' | 'area' | 'readonly';
  options?: { value: string; label: string }[];
  width?: string;
}

type Row = Record<string, any>;

function Cell({ col, value, onChange }: { col: Col; value: any; onChange: (v: any) => void }) {
  const base = 'input !min-h-[36px] text-sm';
  switch (col.type) {
    case 'bool':
      return <input type="checkbox" className="h-5 w-5" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-label={col.label} />;
    case 'number':
      return <input type="number" className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} aria-label={col.label} />;
    case 'select':
      return (
        <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={col.label}>
          <option value="">—</option>
          {col.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'area':
      return <textarea className={base + ' min-h-[80px]'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={col.label} />;
    case 'json':
      return <input className={base + ' font-mono'} value={typeof value === 'string' ? value : JSON.stringify(value)} onChange={(e) => onChange(e.target.value)} aria-label={col.label} />;
    case 'readonly':
      return <span className="text-sm text-muted">{String(value ?? '')}</span>;
    default:
      return <input className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={col.label} />;
  }
}

function toPayload(columns: Col[], draft: Row) {
  const out: Row = { ...draft };
  for (const c of columns) {
    if (c.type === 'json' && typeof out[c.key] === 'string') {
      try { out[c.key] = JSON.parse(out[c.key]); } catch { throw new Error(`"${c.label}" must be valid JSON, e.g. 7, "high", true or ["a","b"].`); }
    }
    if (c.type === 'readonly') delete out[c.key];
  }
  return out;
}

function EditRow({ table, keyField, textKey, columns, row, deletable, grid }: {
  table: string; keyField: string; textKey: boolean; columns: Col[]; row: Row; deletable: boolean; grid: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Row>(row);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  return (
    <div className="grid items-center gap-2 border-b border-line p-2 last:border-0" style={{ gridTemplateColumns: grid }}>
      {textKey && <span className="px-1 text-sm font-mono text-muted">{row[keyField]}</span>}
      {columns.map((c) => <Cell key={c.key} col={c} value={draft[c.key]} onChange={(v) => setDraft({ ...draft, [c.key]: v })} />)}
      <div className="flex gap-1">
        <button className="btn btn-sm btn-primary" disabled={!dirty || pending} aria-label="Save row" onClick={() => start(async () => {
          try {
            const r = await adminSave(table, toPayload(columns, { ...draft, [keyField]: row[keyField] }), keyField);
            if (r.ok) { toast('Saved', 'success'); router.refresh(); } else toast(r.error, 'error');
          } catch (e: any) { toast(e.message, 'error'); }
        })}>{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</button>
        {deletable && (
          <button className="btn btn-sm" disabled={pending} aria-label="Delete row" onClick={() => {
            if (!confirm('Delete this item? This cannot be undone.')) return;
            start(async () => {
              const r = await adminDelete(table, keyField, String(row[keyField]));
              if (r.ok) { toast('Deleted', 'success'); router.refresh(); } else toast(r.error, 'error');
            });
          }}><Trash2 className="h-3 w-3" /></button>
        )}
      </div>
    </div>
  );
}

export function EditableTable({ title, hint, table, keyField, textKey = false, columns, rows, addable = true, deletable = true, lockedKeys = [], defaults = {} }: {
  title: string; hint?: string; table: string; keyField: string; textKey?: boolean; columns: Col[]; rows: Row[];
  addable?: boolean; deletable?: boolean; lockedKeys?: string[]; defaults?: Row;
}) {
  const router = useRouter();
  const [fresh, setFresh] = useState<Row>(defaults);
  const [pending, start] = useTransition();
  const grid = `${textKey ? '110px ' : ''}${columns.map((c) => c.width ?? (c.type === 'bool' ? '56px' : c.type === 'number' ? '90px' : 'minmax(120px,1fr)')).join(' ')} 84px`;
  const heads = [...(textKey ? [keyField] : []), ...columns.map((c) => c.label), ''];

  return (
    <section className="card overflow-x-auto" aria-label={title}>
      <div className="border-b border-line p-4">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="min-w-[640px]">
        <div className="grid gap-2 border-b border-line bg-sunken px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted" style={{ gridTemplateColumns: grid }}>
          {heads.map((h, i) => <span key={i}>{h}</span>)}
        </div>
        {rows.map((r) => (
          <EditRow key={String(r[keyField])} table={table} keyField={keyField} textKey={textKey} columns={columns} row={r} grid={grid} deletable={deletable && !r.is_system && !lockedKeys.includes(String(r[keyField]))} />
        ))}
        {addable && (
          <div className="grid items-center gap-2 bg-sunken/50 p-2" style={{ gridTemplateColumns: grid }}>
            {textKey && <input className="input !min-h-[36px] text-sm" placeholder="key" value={fresh[keyField] ?? ''} onChange={(e) => setFresh({ ...fresh, [keyField]: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} aria-label="New key" />}
            {columns.map((c) => <Cell key={c.key} col={c.type === 'readonly' ? { ...c, type: 'text' } : c} value={fresh[c.key]} onChange={(v) => setFresh({ ...fresh, [c.key]: v })} />)}
            <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
              try {
                const r = await adminSave(table, toPayload(columns, fresh), keyField);
                if (r.ok) { toast('Added', 'success'); setFresh(defaults); router.refresh(); } else toast(r.error, 'error');
              } catch (e: any) { toast(e.message, 'error'); }
            })}>{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add</button>
          </div>
        )}
      </div>
    </section>
  );
}
