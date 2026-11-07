import { supabaseServer } from '@/lib/supabase/server';
import { EditableTable } from '@/components/EditableTable';

export const metadata = { title: 'Statuses, SLA & Settings' };

export default async function Workflow() {
  const supabase = supabaseServer();
  const [{ data: statuses }, { data: priorities }, { data: settings }] = await Promise.all([
    supabase.from('statuses').select('*').order('sort'),
    supabase.from('priorities').select('*').order('sort'),
    supabase.from('settings').select('*').order('key'),
  ]);
  return (
    <div className="space-y-6">
      <EditableTable title="Ticket statuses" hint="Built-in statuses drive the workflow and cannot be deleted, but you can rename them. Add your own (e.g. 'Waiting for ERP Team') and pick which group it belongs to." table="statuses" keyField="key" textKey rows={statuses ?? []}
        columns={[
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'kind', label: 'Group', type: 'select', options: ['open', 'active', 'waiting', 'resolved', 'closed'].map((k) => ({ value: k, label: k })) },
          { key: 'sort', label: 'Order', type: 'number' },
        ]}
        canDelete={(r) => !r.is_system} defaults={{ kind: 'waiting', sort: 9 }} />

      <EditableTable title="Priorities & SLA" hint="SLA hours = how long staff have to respond before a ticket is flagged overdue." table="priorities" keyField="key" textKey rows={priorities ?? []}
        columns={[
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'sla_hours', label: 'Respond within (hours)', type: 'number', width: '150px' },
          { key: 'sort', label: 'Order', type: 'number' },
          { key: 'student_selectable', label: 'Students can pick', type: 'bool', width: '120px' },
        ]}
        canDelete={(r) => !['low', 'medium', 'high', 'urgent'].includes(r.key)} defaults={{ sla_hours: 24, sort: 5, student_selectable: true }} />

      <EditableTable title="System settings" hint='Values are JSON: numbers like 7, true/false, text in quotes like "high", lists like ["mgmu.ac.in"]. Example: set allowed_email_domains to ["yourcollege.edu"] to restrict sign-ups.' table="settings" keyField="key" textKey rows={settings ?? []}
        columns={[
          { key: 'value', label: 'Value (JSON)', type: 'json' },
          { key: 'description', label: 'What it does', type: 'readonly', width: 'minmax(200px,1.4fr)' },
        ]} addable={false} canDelete={() => false} />
    </div>
  );
}
