'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Bell, BookOpen, Home, LayoutDashboard, LogOut, Megaphone, PlusCircle, Settings, Ticket, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle, ToastHost } from '@/components/ClientBits';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { signOut } from '@/app/actions';

interface Item { href: string; label: string; icon: any; badge?: boolean; primary?: boolean }

export function AppShell({ user, unread, appName, children }: {
  user: { id: string; full_name: string; role: 'student' | 'faculty' | 'admin' };
  unread: number;
  appName: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [count, setCount] = useState(unread);
  useEffect(() => setCount(unread), [unread]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel('shell-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (p: any) => { setCount((c) => c + 1); toast(p.new?.title ?? 'New notification', 'info'); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  const student = user.role === 'student';
  const mobile: Item[] = student
    ? [
        { href: '/student', label: 'Home', icon: Home },
        { href: '/tickets', label: 'My Tickets', icon: Ticket },
        { href: '/student/new', label: 'Raise', icon: PlusCircle, primary: true },
        { href: '/notifications', label: 'Alerts', icon: Bell, badge: true },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/staff', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/tickets', label: 'Tickets', icon: Ticket },
        { href: '/notifications', label: 'Alerts', icon: Bell, badge: true },
        { href: '/profile', label: 'Profile', icon: User },
      ];
  const extra: Item[] = student
    ? [{ href: '/kb', label: 'Help Centre', icon: BookOpen }]
    : [
        { href: '/staff/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/staff/announcements', label: 'Announcements', icon: Megaphone },
        { href: '/kb', label: 'Knowledge Base', icon: BookOpen },
        ...(user.role === 'admin' ? [{ href: '/admin/users', label: 'Admin', icon: Settings }] : []),
      ];
  const desktop = [...mobile.filter((i) => !i.primary), ...extra];
  const active = (href: string) => (href === '/student' || href === '/staff' ? path === href : path.startsWith(href));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">{appName[0]}</span>{appName}
        </Link>
        {student && (
          <Link href="/student/new" className="btn btn-primary mb-4"><PlusCircle className="h-4 w-4" /> Raise New Ticket</Link>
        )}
        <nav className="flex-1 space-y-1" aria-label="Main">
          {desktop.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? 'page' : undefined}
              className={cn('flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-sunken', active(i.href) && 'bg-sunken text-accent')}>
              <i.icon className="h-4 w-4" aria-hidden /> {i.label}
              {i.badge && count > 0 && <span className="ml-auto rounded-full bg-red-600 px-1.5 text-xs text-white">{count > 99 ? '99+' : count}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-3">
          <div className="mb-2 truncate px-2 text-sm font-medium">{user.full_name}</div>
          <div className="px-2 pb-2 text-xs capitalize text-muted">{user.role}</div>
          <div className="flex gap-2">
            <ThemeToggle />
            <form action={signOut} className="flex-1"><button className="btn btn-sm w-full"><LogOut className="h-4 w-4" /> Sign out</button></form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-accent-ink">{appName[0]}</span>{appName}
          </Link>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${mobile.length}, 1fr)` }} aria-label="Main">
        {mobile.map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i.href) ? 'page' : undefined}
            className={cn('relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active(i.href) ? 'text-accent' : 'text-muted')}>
            <i.icon className={cn('h-5 w-5', i.primary && 'h-7 w-7 text-accent')} aria-hidden />
            {i.label}
            {i.badge && count > 0 && <span className="absolute right-[28%] top-1.5 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{count > 99 ? '99+' : count}</span>}
          </Link>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}
