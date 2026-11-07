import { AppShell } from '@/components/AppShell';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { APP_NAME } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile();
  const supabase = supabaseServer();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('is_read', false);
  return (
    <AppShell user={{ id: me.id, full_name: me.full_name, role: me.role }} unread={count ?? 0} appName={APP_NAME}>
      {children}
    </AppShell>
  );
}
