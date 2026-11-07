import { supabaseServer } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { Pagination } from '@/components/Pagination';
import { UserTools, UserRow } from './Client';

export const metadata = { title: 'Users' };
export const maxDuration = 60; // CSV imports can take a while
const PAGE = 50;

export default async function Users({ searchParams }: { searchParams: { q?: string; role?: string; page?: string } }) {
  const me = await requireProfile(['admin']);
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const term = (searchParams.q ?? '').replace(/[%,()*\\]/g, ' ').trim();

  let q = supabase.from('profiles').select('*', { count: 'exact' }).order('role').order('full_name').range((page - 1) * PAGE, page * PAGE - 1);
  if (searchParams.role) q = q.eq('role', searchParams.role);
  if (term) {
    const { data: codes } = await supabase.from('student_details').select('user_id').ilike('student_code', `%${term}%`).limit(100);
    const ids = (codes ?? []).map((c: any) => c.user_id);
    q = q.or([`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, ...(ids.length ? [`id.in.(${ids.join(',')})`] : [])].join(','));
  }
  const [{ data: users, count }, { data: depts }] = await Promise.all([q, supabase.from('departments').select('id, name').order('name')]);
  const ids = (users ?? []).map((u: any) => u.id);
  const [{ data: sds }, { data: fds }] = await Promise.all([
    supabase.from('student_details').select('*').in('user_id', ids),
    supabase.from('faculty_details').select('*').in('user_id', ids),
  ]);
  const sd = Object.fromEntries((sds ?? []).map((s: any) => [s.user_id, s]));
  const fd = Object.fromEntries((fds ?? []).map((s: any) => [s.user_id, s]));
  const programs = (await supabase.from('programs').select('name').order('name')).data ?? [];
  const domains = (cfg.settings.allowed_email_domains as string[]) ?? [];

  return (
    <div className="space-y-5">
      <UserTools departments={depts ?? []} programs={programs.map((p: any) => p.name)} />

      {domains.length === 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
          Anyone with any email address can currently create a student account. Before sharing the app, set <strong>allowed_email_domains</strong> (e.g. <code>[&quot;yourcollege.edu&quot;]</code>) under Statuses, SLA &amp; Settings.
        </p>
      )}

      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={term} className="input !w-auto min-w-[220px] flex-1" placeholder="Search name, email or student ID…" type="search" aria-label="Search users" />
        <select name="role" defaultValue={searchParams.role ?? ''} className="input !w-auto" aria-label="Role"><option value="">All roles</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Admins</option></select>
        <button className="btn">Search</button>
      </form>

      <div className="space-y-2">
        {(users ?? []).map((u: any) => (
          <UserRow key={u.id} user={u} isSelf={u.id === me.id} departments={depts ?? []} details={u.role === 'student' ? sd[u.id] ?? {} : fd[u.id] ?? {}} />
        ))}
      </div>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} params={{ q: term, role: searchParams.role }} basePath="/admin/users" />
    </div>
  );
}
