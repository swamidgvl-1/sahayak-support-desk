'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, CircleDot, Clock, Lock, Minus, PauseCircle, Timer } from 'lucide-react';
import { cn, slaInfo } from '@/lib/utils';

const KIND_STYLE: Record<string, { cls: string; Icon: any }> = {
  open: { cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200', Icon: CircleDot },
  active: { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200', Icon: Clock },
  waiting: { cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200', Icon: PauseCircle },
  resolved: { cls: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200', Icon: CheckCircle2 },
  closed: { cls: 'bg-stone-200 text-stone-700 dark:bg-stone-500/25 dark:text-stone-200', Icon: Lock },
};
const FALLBACK_KIND: Record<string, string> = {
  open: 'open', assigned: 'open', reopened: 'open', in_progress: 'active',
  waiting_student: 'waiting', waiting_department: 'waiting', resolved: 'resolved', closed: 'closed',
};

export function StatusBadge({ status, label, kind }: { status: string; label?: string; kind?: string }) {
  const k = kind || FALLBACK_KIND[status] || 'open';
  const { cls, Icon } = KIND_STYLE[k] ?? KIND_STYLE.open;
  return (
    <span className={cn('badge', cls)}>
      <Icon className="h-3 w-3" aria-hidden /> {label || status.replace(/_/g, ' ')}
    </span>
  );
}

const PRIO: Record<string, { cls: string; Icon: any }> = {
  low: { cls: 'bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-200', Icon: ArrowDown },
  medium: { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200', Icon: Minus },
  high: { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200', Icon: ArrowUp },
  urgent: { cls: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200', Icon: AlertTriangle },
};
export function PriorityBadge({ priority, label }: { priority: string; label?: string }) {
  const { cls, Icon } = PRIO[priority] ?? PRIO.medium;
  return (
    <span className={cn('badge', cls)}>
      <Icon className="h-3 w-3" aria-hidden /> {label || priority}
    </span>
  );
}

const SLA_STYLE = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
  over: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  done: 'bg-stone-100 text-stone-600 dark:bg-stone-500/20 dark:text-stone-300',
};
export function SlaChip({ ticket, warnPct = 25 }: { ticket: { sla_deadline: string | null; created_at: string; first_response_at: string | null; status: string }; warnPct?: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const info = slaInfo(ticket, warnPct, now ?? new Date(ticket.created_at).getTime());
  const Icon = info.state === 'over' ? AlertTriangle : info.state === 'done' ? CheckCircle2 : Timer;
  if (now === null && info.state !== 'done') return <span className="badge bg-stone-100 text-stone-600 dark:bg-stone-500/20 dark:text-stone-300">SLA…</span>;
  return (
    <span className={cn('badge', SLA_STYLE[info.state])}>
      <Icon className="h-3 w-3" aria-hidden /> {info.label}
    </span>
  );
}
