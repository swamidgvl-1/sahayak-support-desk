'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Info, Moon, Sun, XCircle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  return (
    <button
      className="btn btn-sm"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
      }}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; message: string; kind: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const h = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const id = ++n;
      setItems((s) => [...s, { id, message, kind }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
    };
    window.addEventListener('app:toast', h);
    return () => window.removeEventListener('app:toast', h);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg',
          t.kind === 'error' ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950 dark:text-red-100'
            : t.kind === 'success' ? 'border-green-300 bg-green-50 text-green-900 dark:border-green-500/40 dark:bg-green-950 dark:text-green-100'
            : 'border-line bg-surface')}>
          {t.kind === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> : t.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

/** Refresh server data when something changes in realtime (new reply, status change, new notification). */
export function RealtimeRefresh({ table, filter }: { table: string; filter?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel(`rt-${table}-${filter ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, filter, router]);
  return null;
}

export function Greeting({ name }: { name: string }) {
  const [g, setG] = useState('Hello');
  useEffect(() => {
    const h = new Date().getHours();
    setG(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');
  }, []);
  return <h1 className="text-2xl font-semibold">{g}, {name.split(' ')[0]}</h1>;
}
