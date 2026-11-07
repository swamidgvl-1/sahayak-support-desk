import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { EmptyNote } from '@/components/Empty';
import { NotificationList } from './List';

export const metadata = { title: 'Notifications' };

export default async function Notifications() {
  const me = await requireProfile();
  const { data } = await supabaseServer().from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {data?.length ? <NotificationList items={data as any} /> : <EmptyNote>You&apos;re all caught up. Updates on your tickets will appear here.</EmptyNote>}
    </div>
  );
}
