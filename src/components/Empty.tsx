import Link from 'next/link';
import { Inbox, PartyPopper } from 'lucide-react';

export function EmptyStudent() {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted" aria-hidden />
      <p className="text-lg font-semibold">No tickets yet.</p>
      <p className="text-sm text-muted">Need help with something?</p>
      <Link href="/student/new" className="btn btn-primary mt-2">Raise a Ticket</Link>
    </div>
  );
}

export function EmptyStaff() {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <PartyPopper className="h-10 w-10 text-muted" aria-hidden />
      <p className="text-lg font-semibold">You&apos;re all caught up.</p>
      <p className="text-sm text-muted">No pending tickets.</p>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="card px-6 py-10 text-center text-sm text-muted">{children}</div>;
}
