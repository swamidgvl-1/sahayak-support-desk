import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

export const TICKET_SELECT =
  '*, category:categories(name), student:profiles!tickets_student_id_fkey(full_name,email), assignee:profiles!tickets_assigned_to_fkey(full_name)';

export type TicketParams = Record<string, string | undefined>;

/** Start of today in India time, as ISO. */
export function startOfTodayIST() {
  const offset = 5.5 * 3_600_000;
  const ist = new Date(Date.now() + offset);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - offset).toISOString();
}

const clean = (s: string) => s.replace(/[%,()*\\]/g, ' ').trim();

export async function queryTickets(
  supabase: SupabaseClient,
  p: TicketParams,
  me: Profile,
  opts: { page?: number; pageSize?: number; all?: boolean } = {}
) {
  const staff = me.role !== 'student';
  let q = supabase.from('tickets').select(TICKET_SELECT, { count: 'exact' });

  if (p.q) {
    const term = clean(p.q);
    if (term) {
      const ors = [`ticket_number.ilike.%${term}%`, `subject.ilike.%${term}%`, `course.ilike.%${term}%`];
      if (!staff) ors.push(`description.ilike.%${term}%`);
      const { data: cats } = await supabase.from('categories').select('id').ilike('name', `%${term}%`);
      if (cats?.length) ors.push(`category_id.in.(${cats.map((c: any) => c.id).join(',')})`);
      if (staff) {
        const [{ data: byName }, { data: byCode }] = await Promise.all([
          supabase.from('profiles').select('id').eq('role', 'student').ilike('full_name', `%${term}%`).limit(200),
          supabase.from('student_details').select('user_id').ilike('student_code', `%${term}%`).limit(200),
        ]);
        const ids = [...(byName ?? []).map((r: any) => r.id), ...(byCode ?? []).map((r: any) => r.user_id)];
        if (ids.length) ors.push(`student_id.in.(${ids.join(',')})`);
      }
      q = q.or(ors.join(','));
    }
  }
  if (p.status) q = q.in('status', p.status.split(','));
  if (p.priority) q = q.in('priority', p.priority.split(','));
  if (p.category) q = q.eq('category_id', p.category);
  if (p.course) q = q.ilike('course', `%${clean(p.course)}%`);
  if (p.semester) q = q.eq('semester', p.semester);
  if (p.open === '1') q = q.not('status', 'in', '(resolved,closed)');
  if (staff && p.assignee) {
    if (p.assignee === 'none') q = q.is('assigned_to', null);
    else q = q.eq('assigned_to', p.assignee === 'me' ? me.id : p.assignee);
  }
  if (p.from) q = q.gte('created_at', p.from === 'today' ? startOfTodayIST() : new Date(p.from).toISOString());
  if (p.to) q = q.lte('created_at', new Date(new Date(p.to).getTime() + 86_399_000).toISOString());
  if (p.sla === 'overdue') {
    q = q.is('first_response_at', null).lt('sla_deadline', new Date().toISOString()).not('status', 'in', '(resolved,closed)');
  }

  const sortCol = ['created_at', 'updated_at', 'sla_deadline'].includes(p.sort ?? '') ? p.sort! : 'updated_at';
  q = q.order(sortCol, { ascending: p.dir === 'asc' });

  if (!opts.all) {
    const size = opts.pageSize ?? 25;
    const page = Math.max(1, opts.page ?? 1);
    q = q.range((page - 1) * size, page * size - 1);
  } else {
    q = q.limit(5000);
  }
  return q;
}
