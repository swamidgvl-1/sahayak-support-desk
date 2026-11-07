'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { markNotificationsRead } from '@/app/actions';
import { cn, timeAgo } from '@/lib/utils';

interface N { id: string; ticket_id: string | null; title: string; message: string; type: string; is_read: boolean; created_at: string }

export function NotificationList({ items }: { items: N[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((i) => !i.is_read).length;
  return (
    <>
      {unread > 0 && (
        <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => { await markNotificationsRead(); router.refresh(); })}>
          <CheckCheck className="h-4 w-4" /> Mark all as read ({unread})
        </button>
      )}
      <ul className="card divide-y divide-line">
        {items.map((n) => (
          <li key={n.id}>
            <button
              className={cn('flex w-full items-start gap-3 p-4 text-left hover:bg-sunken', !n.is_read && 'bg-accent/5')}
              onClick={() => start(async () => { if (!n.is_read) await markNotificationsRead([n.id]); router.push(n.ticket_id ? `/tickets/${n.ticket_id}` : '/'); router.refresh(); })}
            >
              <Bell className={cn('mt-0.5 h-4 w-4 shrink-0', n.type === 'alert' ? 'text-red-600' : 'text-accent')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', !n.is_read && 'font-semibold')}>{n.title}</span>
                <span className="block text-sm text-muted">{n.message}</span>
                <span className="text-xs text-muted">{timeAgo(n.created_at)}</span>
              </span>
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
