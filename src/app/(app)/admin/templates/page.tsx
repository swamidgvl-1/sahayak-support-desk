import { supabaseServer } from '@/lib/supabase/server';
import { EditableTable } from '@/components/EditableTable';

export const metadata = { title: 'Notification templates' };

export default async function Templates() {
  const { data } = await supabaseServer().from('notification_templates').select('*').order('key');
  return (
    <EditableTable title="Notification templates" hint="Use {{ticket}}, {{subject}} and {{status}} as placeholders. These texts are used for in-app, email and push notifications." table="notification_templates" keyField="key" textKey rows={data ?? []}
      columns={[{ key: 'title', label: 'Title', type: 'text' }, { key: 'body', label: 'Message', type: 'area', width: 'minmax(240px,2fr)' }]}
      addable={false} deletable={false} />
  );
}
