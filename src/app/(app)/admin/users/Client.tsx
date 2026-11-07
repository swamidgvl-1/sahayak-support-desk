'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Upload, UserPlus } from 'lucide-react';
import { adminCreateUser, adminImportStudents, adminSaveDetails, adminUpdateUser } from '@/app/actions';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface Dept { id: string; name: string }

export function UserTools({ departments, programs }: { departments: Dept[]; programs: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<'' | 'one' | 'csv'>('');
  const [pending, start] = useTransition();
  const [role, setRole] = useState('student');
  const [csv, setCsv] = useState('');
  const [report, setReport] = useState<string[] | null>(null);

  return (
    <section className="card p-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={() => setOpen(open === 'one' ? '' : 'one')}><UserPlus className="h-4 w-4" /> Add a user</button>
        <button className="btn btn-sm" onClick={() => setOpen(open === 'csv' ? '' : 'csv')}><Upload className="h-4 w-4" /> Import students (CSV)</button>
      </div>

      {open === 'one' && (
        <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => start(async () => {
          const r = await adminCreateUser(fd);
          if (r.ok) { toast('User created. They can sign in with an email code or Google.', 'success'); setOpen(''); router.refresh(); } else toast(r.error, 'error');
        })}>
          <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" className="input" required /></div>
          <div><label className="label" htmlFor="u-name">Full name</label><input id="u-name" name="full_name" className="input" required /></div>
          <div><label className="label" htmlFor="u-role">Role</label>
            <select id="u-role" name="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="student">Student</option><option value="faculty">Faculty / Coordinator</option><option value="admin">Admin</option></select></div>
          <div><label className="label" htmlFor="u-dept">Department</label>
            <select id="u-dept" name="department_id" className="input"><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          {role === 'student' ? (
            <>
              <div><label className="label" htmlFor="u-code">Student ID</label><input id="u-code" name="student_code" className="input" /></div>
              <div><label className="label" htmlFor="u-prog">Program</label><select id="u-prog" name="program" className="input"><option value="">—</option>{programs.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label className="label" htmlFor="u-sem">Semester</label><input id="u-sem" name="semester" type="number" min={1} max={12} className="input" /></div>
              <div><label className="label" htmlFor="u-div">Division</label><input id="u-div" name="division" className="input" /></div>
              <div><label className="label" htmlFor="u-year">Academic year</label><input id="u-year" name="academic_year" className="input" placeholder="2026-27" /></div>
            </>
          ) : (
            <>
              <div><label className="label" htmlFor="u-emp">Employee ID</label><input id="u-emp" name="employee_id" className="input" /></div>
              <div><label className="label" htmlFor="u-des">Designation</label><input id="u-des" name="designation" className="input" /></div>
            </>
          )}
          <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Create user</button></div>
        </form>
      )}

      {open === 'csv' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">One student per line, up to 200 at a time. Columns: <code>email, full name, student ID, program, semester, division, academic year</code>. Only the email is required.</p>
          <textarea className="input min-h-[140px] font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'rahul.patil@college.edu, Rahul Patil, MBA2026-001, MBA, 3, A, 2026-27\nsneha.sharma@college.edu, Sneha Sharma, MBA2026-002, MBA, 3, A, 2026-27'} aria-label="CSV rows" />
          <button className="btn btn-primary" disabled={pending || !csv.trim()} onClick={() => start(async () => {
            const r = await adminImportStudents(csv);
            if (r.ok) { setReport([`${r.done} student(s) imported.`, ...r.errors]); if (!r.errors.length) setCsv(''); router.refresh(); } else toast(r.error, 'error');
          })}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Import</button>
          {report && <ul className="rounded-lg bg-sunken p-3 text-sm">{report.map((l, i) => <li key={i} className={i ? 'text-red-700 dark:text-red-300' : 'font-medium'}>{l}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

export function UserRow({ user, isSelf, departments, details }: { user: any; isSelf: boolean; departments: Dept[]; details: Record<string, any> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState(user.role);
  const [dept, setDept] = useState(user.department_id ?? '');
  const [status, setStatus] = useState(user.status);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Record<string, any>>(details);
  const dirty = role !== user.role || dept !== (user.department_id ?? '') || status !== user.status;
  const kind = user.role === 'student' ? 'student' : 'faculty';

  const fields: [string, string][] = kind === 'student'
    ? [['student_code', 'Student ID'], ['program', 'Program'], ['semester', 'Semester'], ['division', 'Division'], ['academic_year', 'Academic year']]
    : [['employee_id', 'Employee ID'], ['designation', 'Designation']];

  return (
    <div className="card p-3">
      <div className="grid items-center gap-2 md:grid-cols-[1.4fr_1.4fr_130px_170px_110px_auto]">
        <div className="min-w-0"><div className="truncate font-medium">{user.full_name || '—'}</div><div className="truncate text-xs text-muted">{user.email}</div></div>
        <div className="truncate text-xs text-muted">{details.student_code ?? details.employee_id ?? ''}</div>
        <select className="input !min-h-[36px] text-sm" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} aria-label={`Role for ${user.full_name}`}>
          <option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option></select>
        <select className="input !min-h-[36px] text-sm" value={dept} onChange={(e) => setDept(e.target.value)} aria-label={`Department for ${user.full_name}`}>
          <option value="">No department</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select className={cn('input !min-h-[36px] text-sm', status === 'disabled' && 'text-red-700')} value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSelf} aria-label={`Status for ${user.full_name}`}>
          <option value="active">Active</option><option value="disabled">Disabled</option></select>
        <div className="flex gap-1">
          <button className="btn btn-sm btn-primary" disabled={!dirty || pending} onClick={() => start(async () => {
            const r = await adminUpdateUser(user.id, { role, department_id: dept || null, status });
            if (r.ok) { toast('User updated', 'success'); router.refresh(); } else toast(r.error, 'error');
          })}>{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}</button>
          <button className="btn btn-sm" aria-label="Edit details" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
        </div>
      </div>
      {open && (
        <form className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3" onSubmit={(e) => {
          e.preventDefault();
          const payload: Record<string, any> = {};
          fields.forEach(([k]) => { const v = d[k]; payload[k] = v === '' || v == null ? null : k === 'semester' ? Number(v) || null : v; });
          start(async () => {
            const r = await adminSaveDetails(user.id, kind, payload);
            if (r.ok) { toast('Details saved', 'success'); router.refresh(); } else toast(r.error, 'error');
          });
        }}>
          {fields.map(([k, label]) => (
            <div key={k}><label className="label" htmlFor={`${user.id}-${k}`}>{label}</label><input id={`${user.id}-${k}`} className="input" value={d[k] ?? ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></div>
          ))}
          <div className="flex items-end"><button className="btn btn-sm btn-primary" disabled={pending}>Save details</button></div>
        </form>
      )}
    </div>
  );
}
