'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const friendly = (m?: string) => m || 'Something went wrong. Please try again.';

async function ctx(roles?: ('student' | 'faculty' | 'admin')[]) {
  const me = await getProfile();
  if (!me || me.status !== 'active') throw new Error('Please sign in again.');
  if (roles && !roles.includes(me.role)) throw new Error('You do not have permission to do that.');
  return { me, supabase: supabaseServer() };
}
const staff = () => ctx(['faculty', 'admin']);
const admin = () => ctx(['admin']);

async function audit(supabase: ReturnType<typeof supabaseServer>, action: string, entity: string, id: string, meta: object = {}) {
  await supabase.rpc('log_event', { p_action: action, p_entity: entity, p_entity_id: id, p_meta: meta });
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect('/login');
}

/* ------------------------------ tickets ------------------------------ */

export async function createTicket(input: {
  category_id: string; subcategory_id: string | null; subject: string; description: string;
  priority: string; course?: string; semester?: string; academic_year?: string; contact_method?: string;
}) {
  try {
    const { me, supabase } = await ctx(['student']);
    const subject = input.subject.trim();
    const description = input.description.trim();
    if (subject.length < 3) return fail('Please enter a short subject (at least 3 characters).');
    if (description.length < 3) return fail('Please describe the problem.');
    if (subject.length > 200 || description.length > 5000) return fail('Your text is too long.');

    // duplicate-submit guard
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: dup } = await supabase.from('tickets').select('id, ticket_number')
      .eq('student_id', me.id).eq('subject', subject).gte('created_at', since).limit(1);
    if (dup?.length) return { ok: true as const, id: dup[0].id as string, ticket_number: dup[0].ticket_number as string };

    const { data, error } = await supabase.from('tickets').insert({
      student_id: me.id,
      category_id: input.category_id,
      subcategory_id: input.subcategory_id || null,
      subject, description,
      priority: input.priority || 'medium',
      course: input.course?.trim() || null,
      semester: input.semester?.trim() || null,
      academic_year: input.academic_year?.trim() || null,
      contact_method: input.contact_method || 'app',
    }).select('id, ticket_number').single();
    if (error || !data) return fail('Something went wrong while submitting your ticket. Please try again.');
    revalidatePath('/student'); revalidatePath('/tickets');
    return { ok: true as const, id: data.id as string, ticket_number: data.ticket_number as string };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function postMessage(ticketId: string, body: string, kind: 'reply' | 'internal') {
  try {
    const { me, supabase } = await ctx();
    if (kind === 'internal' && me.role === 'student') return fail('Not allowed.');
    const text = body.trim();
    if (!text) return fail('Please type a message.');
    const { data, error } = await supabase.from('ticket_messages')
      .insert({ ticket_id: ticketId, sender_id: me.id, body: text, kind }).select('id').single();
    if (error || !data) return fail(error?.message?.includes('closed') ? error.message : 'Could not send your message. Please try again.');
    revalidatePath(`/tickets/${ticketId}`);
    return { ok: true as const, id: data.id as string };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function staffUpdateTicket(ticketId: string, patch: { status?: string; priority?: string; assigned_to?: string | null; tags?: string[] }) {
  try {
    const { supabase } = await staff();
    if (patch.status === 'resolved') return fail('Use "Resolve ticket" so a resolution note is recorded.');
    const clean: any = {};
    if (patch.status) clean.status = patch.status;
    if (patch.priority) clean.priority = patch.priority;
    if (patch.assigned_to !== undefined) clean.assigned_to = patch.assigned_to || null;
    if (patch.tags) clean.tags = patch.tags.map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 10);
    const { error } = await supabase.from('tickets').update(clean).eq('id', ticketId);
    if (error) return fail('Could not update the ticket.');
    revalidatePath(`/tickets/${ticketId}`); revalidatePath('/tickets'); revalidatePath('/staff');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function resolveTicket(ticketId: string, resolution: string) {
  try {
    const { me, supabase } = await staff();
    const text = resolution.trim();
    if (text.length < 3) return fail('Please describe how the issue was resolved.');
    const { error } = await supabase.from('tickets').update({ status: 'resolved', resolution: text }).eq('id', ticketId);
    if (error) return fail('Could not resolve the ticket.');
    await supabase.from('ticket_messages').insert({ ticket_id: ticketId, sender_id: me.id, body: `Resolution: ${text}`, kind: 'reply' });
    revalidatePath(`/tickets/${ticketId}`); revalidatePath('/tickets'); revalidatePath('/staff');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function bulkUpdate(ids: string[], patch: { status?: string; assigned_to?: string | null }) {
  try {
    const { supabase } = await staff();
    if (!ids.length) return fail('Select at least one ticket.');
    if (patch.status === 'resolved') return fail('Resolve tickets one by one so each gets a resolution note.');
    const clean: any = {};
    if (patch.status) clean.status = patch.status;
    if (patch.assigned_to !== undefined) clean.assigned_to = patch.assigned_to || null;
    if (!Object.keys(clean).length) return fail('Choose what to change.');
    const { error } = await supabase.from('tickets').update(clean).in('id', ids.slice(0, 200));
    if (error) return fail('Could not update the selected tickets.');
    revalidatePath('/tickets'); revalidatePath('/staff');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function studentRespond(ticketId: string, action: 'confirm' | 'reopen', rating?: number, comment?: string) {
  try {
    const { supabase } = await ctx(['student']);
    const { error } = await supabase.rpc('student_respond', {
      p_ticket: ticketId, p_action: action, p_rating: rating ?? null, p_comment: comment ?? null,
    });
    if (error) return fail(error.message);
    revalidatePath(`/tickets/${ticketId}`); revalidatePath('/tickets'); revalidatePath('/student');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

/* --------------------------- notifications --------------------------- */

export async function markNotificationsRead(ids?: string[]) {
  const { me, supabase } = await ctx();
  let q = supabase.from('notifications').update({ is_read: true }).eq('user_id', me.id).eq('is_read', false);
  if (ids?.length) q = q.in('id', ids);
  await q;
  revalidatePath('/notifications');
  return { ok: true as const };
}

/* ------------------------------ profile ------------------------------ */

export async function updateProfile(fields: { full_name: string; phone: string }) {
  try {
    const { me, supabase } = await ctx();
    const name = fields.full_name.trim();
    if (name.length < 2) return fail('Please enter your name.');
    const phone = fields.phone.trim();
    if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) return fail('Please enter a valid mobile number.');
    const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone || null }).eq('id', me.id);
    if (error) return fail('Could not save your profile.');
    revalidatePath('/profile');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function savePushSubscription(sub: object) {
  const { me, supabase } = await ctx();
  await supabase.from('push_subscriptions').insert({ user_id: me.id, subscription: sub });
  return { ok: true as const };
}

/* --------------- announcements, knowledge base, saved views --------------- */

export async function createAnnouncement(fd: FormData) {
  const { me, supabase } = await staff();
  const title = String(fd.get('title') || '').trim();
  const body = String(fd.get('body') || '').trim();
  if (!title || !body) return;
  const expires = String(fd.get('expires_at') || '');
  await supabase.from('announcements').insert({
    title, body, created_by: me.id,
    priority: fd.get('priority') === 'important' ? 'important' : 'normal',
    expires_at: expires ? new Date(expires + 'T23:59:59+05:30').toISOString() : null,
  });
  revalidatePath('/staff/announcements'); revalidatePath('/student');
}
export async function deleteAnnouncement(fd: FormData) {
  const { supabase } = await staff();
  await supabase.from('announcements').delete().eq('id', String(fd.get('id')));
  revalidatePath('/staff/announcements'); revalidatePath('/student');
}

export async function createKb(fd: FormData) {
  const { supabase } = await staff();
  const question = String(fd.get('question') || '').trim();
  const answer = String(fd.get('answer') || '').trim();
  if (!question || !answer) return;
  await supabase.from('kb_articles').insert({ question, answer, category_id: String(fd.get('category_id') || '') || null });
  revalidatePath('/kb');
}
export async function deleteKb(fd: FormData) {
  const { supabase } = await staff();
  await supabase.from('kb_articles').delete().eq('id', String(fd.get('id')));
  revalidatePath('/kb');
}

export async function saveView(name: string, query: string) {
  const { me, supabase } = await staff();
  if (!name.trim()) return fail('Give the view a name.');
  await supabase.from('saved_views').insert({ user_id: me.id, name: name.trim().slice(0, 40), query });
  revalidatePath('/tickets');
  return { ok: true as const };
}
export async function deleteView(id: string) {
  const { supabase } = await staff();
  await supabase.from('saved_views').delete().eq('id', id);
  revalidatePath('/tickets');
  return { ok: true as const };
}

/* ------------------------------- admin ------------------------------- */

const CONFIG_TABLES = ['departments', 'programs', 'categories', 'subcategories', 'statuses', 'priorities', 'settings', 'notification_templates'];

export async function adminSave(table: string, row: Record<string, any>, keyField: string) {
  try {
    const { supabase } = await admin();
    if (!CONFIG_TABLES.includes(table)) return fail('Unknown table.');
    const clean: any = {};
    for (const [k, v] of Object.entries(row)) clean[k] = v === '' ? null : v;
    if (!clean[keyField]) delete clean[keyField];
    const { error } = await supabase.from(table).upsert(clean, { onConflict: keyField });
    if (error) return fail(error.message.includes('duplicate') ? 'That name already exists.' : 'Could not save.');
    await audit(supabase, 'config.save', table, String(row[keyField] ?? row.name ?? row.key ?? ''));
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function adminDelete(table: string, keyField: string, value: string) {
  try {
    const { supabase } = await admin();
    if (!CONFIG_TABLES.includes(table)) return fail('Unknown table.');
    const { error } = await supabase.from(table).delete().eq(keyField, value);
    if (error) return fail('Could not delete — it is probably still in use. Try marking it inactive instead.');
    await audit(supabase, 'config.delete', table, value);
    revalidatePath('/admin', 'layout');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function adminUpdateUser(id: string, patch: { role?: string; department_id?: string | null; status?: string; full_name?: string }) {
  try {
    const { me, supabase } = await admin();
    if (id === me.id && (patch.role && patch.role !== 'admin' || patch.status === 'disabled')) {
      return fail('You cannot remove your own admin access.');
    }
    const clean: any = {};
    if (patch.role && ['student', 'faculty', 'admin'].includes(patch.role)) clean.role = patch.role;
    if (patch.department_id !== undefined) clean.department_id = patch.department_id || null;
    if (patch.status && ['active', 'disabled'].includes(patch.status)) clean.status = patch.status;
    if (patch.full_name) clean.full_name = patch.full_name.trim();
    const { error } = await supabase.from('profiles').update(clean).eq('id', id);
    if (error) return fail('Could not update the user.');
    if (clean.role === 'faculty' || clean.role === 'admin') {
      await supabase.from('faculty_details').upsert({ user_id: id }, { onConflict: 'user_id', ignoreDuplicates: true });
    }
    await audit(supabase, 'user.update', 'user', id, clean);
    revalidatePath('/admin/users');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

export async function adminSaveDetails(id: string, kind: 'student' | 'faculty', d: Record<string, any>) {
  try {
    const { supabase } = await admin();
    const table = kind === 'student' ? 'student_details' : 'faculty_details';
    const { error } = await supabase.from(table).upsert({ user_id: id, ...d }, { onConflict: 'user_id' });
    if (error) return fail(error.message.includes('duplicate') ? 'That ID is already used by someone else.' : 'Could not save details.');
    await audit(supabase, 'user.details', 'user', id);
    revalidatePath('/admin/users');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

interface NewUser { email: string; full_name: string; role?: string; department_id?: string | null; student_code?: string; program?: string; semester?: string; division?: string; academic_year?: string; employee_id?: string; designation?: string }

async function createOne(u: NewUser): Promise<string | null> {
  const svc = supabaseAdmin();
  const email = u.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return `${u.email}: not a valid email`;
  const { data, error } = await svc.auth.admin.createUser({
    email, email_confirm: true, password: randomUUID() + 'aA1!', user_metadata: { full_name: u.full_name },
  });
  let id = data?.user?.id;
  if (error || !id) {
    // already registered? just update their details
    const { data: existing } = await svc.from('profiles').select('id').eq('email', email).maybeSingle();
    if (!existing) return `${email}: ${error?.message ?? 'could not create'}`;
    id = existing.id;
  }
  const role = u.role && ['student', 'faculty', 'admin'].includes(u.role) ? u.role : 'student';
  await svc.from('profiles').update({ full_name: u.full_name || undefined, role, department_id: u.department_id || null }).eq('id', id);
  if (role === 'student') {
    await svc.from('student_details').upsert({
      user_id: id, student_code: u.student_code || null, program: u.program || null,
      semester: u.semester ? Number(u.semester) || null : null, division: u.division || null, academic_year: u.academic_year || null,
    }, { onConflict: 'user_id' });
  } else {
    await svc.from('student_details').delete().eq('user_id', id);
    await svc.from('faculty_details').upsert({ user_id: id, employee_id: u.employee_id || null, designation: u.designation || null }, { onConflict: 'user_id' });
  }
  return null;
}

export async function adminCreateUser(fd: FormData) {
  try {
    const { supabase } = await admin();
    const err = await createOne({
      email: String(fd.get('email') || ''), full_name: String(fd.get('full_name') || ''),
      role: String(fd.get('role') || 'student'), department_id: String(fd.get('department_id') || '') || null,
      student_code: String(fd.get('student_code') || ''), program: String(fd.get('program') || ''),
      semester: String(fd.get('semester') || ''), division: String(fd.get('division') || ''),
      academic_year: String(fd.get('academic_year') || ''), employee_id: String(fd.get('employee_id') || ''),
      designation: String(fd.get('designation') || ''),
    });
    if (err) return fail(err);
    await audit(supabase, 'user.create', 'user', String(fd.get('email')));
    revalidatePath('/admin/users');
    return { ok: true as const };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}

/** CSV columns: email, full_name, student_code, program, semester, division, academic_year */
export async function adminImportStudents(csv: string) {
  try {
    const { supabase } = await admin();
    const rows = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
      .filter((c) => c[0] && c[0].toLowerCase() !== 'email');
    if (!rows.length) return fail('Paste at least one row.');
    if (rows.length > 200) return fail('Please import at most 200 rows at a time.');
    const errors: string[] = [];
    let done = 0;
    for (let i = 0; i < rows.length; i += 5) {
      const results = await Promise.all(rows.slice(i, i + 5).map((c) =>
        createOne({ email: c[0], full_name: c[1] || c[0].split('@')[0], role: 'student', student_code: c[2], program: c[3], semester: c[4], division: c[5], academic_year: c[6] })));
      results.forEach((r) => (r ? errors.push(r) : done++));
    }
    await audit(supabase, 'user.import', 'user', String(done), { errors: errors.length });
    revalidatePath('/admin/users');
    return { ok: true as const, done, errors };
  } catch (e: any) {
    return fail(friendly(e.message));
  }
}
