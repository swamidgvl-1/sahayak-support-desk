import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { ProfileForm, PushToggle } from './Forms';
import { signOut } from '@/app/actions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const me = await requireProfile();
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const [{ data: sd }, { data: fd }, { data: dept }] = await Promise.all([
    me.role === 'student' ? supabase.from('student_details').select('*').eq('user_id', me.id).maybeSingle() : Promise.resolve({ data: null }),
    me.role !== 'student' ? supabase.from('faculty_details').select('*').eq('user_id', me.id).maybeSingle() : Promise.resolve({ data: null }),
    me.department_id ? supabase.from('departments').select('name').eq('id', me.department_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const myCats = cfg.categories.filter((c) => c.default_assignee === me.id).map((c) => c.name);

  const rows: [string, string | null | undefined][] = me.role === 'student'
    ? [['Student ID', (sd as any)?.student_code], ['Program', (sd as any)?.program], ['Department', (dept as any)?.name], ['Semester', (sd as any)?.semester?.toString()], ['Division', (sd as any)?.division], ['Academic year', (sd as any)?.academic_year]]
    : [['Employee ID', (fd as any)?.employee_id], ['Designation', (fd as any)?.designation], ['Department', (dept as any)?.name], ['Assigned categories', myCats.join(', ')]];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <ProfileForm name={me.full_name} email={me.email} phone={me.phone ?? ''} role={me.role} />
      <dl className="card grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 p-4 text-sm">
        {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-xs font-medium text-muted">{k}</dt><dd>{v || '—'}</dd></div>))}
      </dl>
      <p className="text-xs text-muted">Academic details are managed by the administrator. Contact them if something is wrong.</p>
      <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      <form action={signOut}><button className="btn w-full md:hidden">Sign out</button></form>
    </div>
  );
}
