import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { EditableTable } from '@/components/EditableTable';

export const metadata = { title: 'Categories & Departments' };

const ICONS = ['monitor', 'calendar-check', 'file-text', 'graduation-cap', 'clipboard-list', 'book-open', 'award', 'indian-rupee', 'id-card', 'clock', 'library', 'wrench', 'user-round', 'flask-conical', 'help-circle'];

export default async function Catalog({ searchParams }: { searchParams: { cat?: string } }) {
  const supabase = supabaseServer();
  const [{ data: depts }, { data: cats }, { data: staff }, { data: programs }] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    supabase.from('categories').select('*').order('sort'),
    supabase.from('profiles').select('id, full_name').in('role', ['faculty', 'admin']).order('full_name'),
    supabase.from('programs').select('*').order('name'),
  ]);
  const catId = searchParams.cat || cats?.[0]?.id;
  const { data: subs } = await supabase.from('subcategories').select('*').eq('category_id', catId ?? '').order('name');

  const deptOpts = (depts ?? []).map((d: any) => ({ value: d.id, label: d.name }));
  const staffOpts = (staff ?? []).map((s: any) => ({ value: s.id, label: s.full_name }));

  return (
    <div className="space-y-6">
      <EditableTable title="Departments" table="departments" keyField="id" rows={depts ?? []} columns={[
        { key: 'name', label: 'Name', type: 'text' }, { key: 'active', label: 'Active', type: 'bool' },
      ]} defaults={{ active: true }} />

      <EditableTable title="Ticket categories" hint="Students see these as cards. The default assignee receives new tickets automatically (auto-assignment)." table="categories" keyField="id" rows={cats ?? []} columns={[
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'icon', label: 'Icon', type: 'select', options: ICONS.map((i) => ({ value: i, label: i })), width: '130px' },
        { key: 'department_id', label: 'Department', type: 'select', options: deptOpts },
        { key: 'default_assignee', label: 'Default assignee', type: 'select', options: staffOpts },
        { key: 'sort', label: 'Order', type: 'number' },
        { key: 'active', label: 'Active', type: 'bool' },
      ]} defaults={{ active: true, sort: (cats?.length ?? 0) + 1 }} />

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Subcategories of:</span>
          {(cats ?? []).map((c: any) => (
            <Link key={c.id} href={`/admin/catalog?cat=${c.id}`} className={`btn btn-sm ${c.id === catId ? 'btn-primary' : ''}`}>{c.name}</Link>
          ))}
        </div>
        {catId && (
          <EditableTable title="Subcategories" table="subcategories" keyField="id" rows={subs ?? []} columns={[
            { key: 'name', label: 'Name', type: 'text' }, { key: 'active', label: 'Active', type: 'bool' },
          ]} defaults={{ active: true, category_id: catId }} />
        )}
      </div>

      <EditableTable title="Student programs" table="programs" keyField="id" rows={programs ?? []} columns={[{ key: 'name', label: 'Program', type: 'text' }]} />
    </div>
  );
}
