'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  ['/admin/users', 'Users'],
  ['/admin/catalog', 'Categories & Departments'],
  ['/admin/workflow', 'Statuses, SLA & Settings'],
  ['/admin/templates', 'Notification templates'],
  ['/admin/audit', 'Audit log'],
];

export default function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4" aria-label="Admin sections">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
          className={cn('whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', path === href ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink')}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
