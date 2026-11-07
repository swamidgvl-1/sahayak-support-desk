-- =====================================================================
-- Sahayak / Campus Support Desk — database schema
-- Run this FIRST in Supabase → SQL Editor (a new, empty project).
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- configuration tables (all admin-editable) ----------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true
);
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  department_id uuid references public.departments on delete set null
);
create table public.statuses (
  key text primary key,
  label text not null,
  kind text not null check (kind in ('open','active','waiting','resolved','closed')),
  sort int not null default 0,
  is_system boolean not null default false
);
create table public.priorities (
  key text primary key,
  label text not null,
  sla_hours int not null default 24,
  sort int not null default 0,
  student_selectable boolean not null default true
);
create table public.settings (
  key text primary key,
  value jsonb not null,
  description text
);
create table public.notification_templates (
  key text primary key,
  title text not null,
  body text not null
);

-- ---------- people ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  role text not null default 'student' check (role in ('student','faculty','admin')),
  department_id uuid references public.departments on delete set null,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);
create table public.student_details (
  user_id uuid primary key references public.profiles on delete cascade,
  student_code text unique,
  program text,
  semester int,
  division text,
  academic_year text
);
create table public.faculty_details (
  user_id uuid primary key references public.profiles on delete cascade,
  employee_id text,
  designation text
);

-- ---------- catalogue ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  icon text,
  department_id uuid references public.departments on delete set null,
  default_assignee uuid references public.profiles on delete set null,
  sort int not null default 0,
  active boolean not null default true
);
create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories on delete cascade,
  name text not null,
  active boolean not null default true,
  unique (category_id, name)
);

-- ---------- tickets ----------
create sequence public.ticket_seq start 1;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique,
  student_id uuid not null references public.profiles on delete cascade,
  category_id uuid references public.categories on delete set null,
  subcategory_id uuid references public.subcategories on delete set null,
  subject text not null check (char_length(subject) between 3 and 200),
  description text not null check (char_length(description) between 3 and 5000),
  priority text not null default 'medium' references public.priorities,
  status text not null default 'open' references public.statuses,
  assigned_to uuid references public.profiles on delete set null,
  course text,
  semester text,
  academic_year text,
  contact_method text default 'app',
  tags text[] not null default '{}',
  resolution text,
  rating int check (rating between 1 and 5),
  rating_comment text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_deadline timestamptz,
  sla_notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tickets (student_id);
create index on public.tickets (assigned_to);
create index on public.tickets (status);
create index on public.tickets (created_at desc);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets on delete cascade,
  sender_id uuid references public.profiles on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  kind text not null default 'reply' check (kind in ('reply','internal','system')),
  created_at timestamptz not null default now()
);
create index on public.ticket_messages (ticket_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets on delete cascade,
  message_id uuid references public.ticket_messages on delete cascade,
  file_name text not null,
  path text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index on public.attachments (ticket_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets on delete cascade,
  assigned_from uuid references public.profiles on delete set null,
  assigned_to uuid references public.profiles on delete set null,
  assigned_by uuid references public.profiles on delete set null,
  assigned_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  ticket_id uuid references public.tickets on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, is_read, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal','important')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories on delete set null,
  question text not null,
  answer text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null,
  query text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);

-- ---------- helper functions ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and status = 'active' $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('faculty','admin'), false) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

create or replace function public.my_dept() returns uuid
language sql stable security definer set search_path = public as
$$ select department_id from public.profiles where id = auth.uid() $$;

create or replace function public.setting(k text) returns jsonb
language sql stable security definer set search_path = public as
$$ select value from public.settings where key = k $$;

-- Fill a notification from an admin-editable template
create or replace function public.notify(p_user uuid, p_ticket uuid, p_key text, p_type text default 'info')
returns void language plpgsql security definer set search_path = public as $$
declare tpl public.notification_templates; t public.tickets; stl text;
begin
  if p_user is null then return; end if;
  select * into tpl from public.notification_templates where key = p_key;
  if not found then return; end if;
  select * into t from public.tickets where id = p_ticket;
  select label into stl from public.statuses where key = t.status;
  insert into public.notifications (user_id, ticket_id, title, message, type)
  values (
    p_user, p_ticket,
    replace(replace(replace(tpl.title, '{{ticket}}', coalesce(t.ticket_number,'')), '{{subject}}', coalesce(t.subject,'')), '{{status}}', coalesce(stl,'')),
    replace(replace(replace(tpl.body,  '{{ticket}}', coalesce(t.ticket_number,'')), '{{subject}}', coalesce(t.subject,'')), '{{status}}', coalesce(stl,'')),
    p_type
  );
end $$;

create or replace function public.log_event(p_action text, p_entity text default null, p_entity_id text default null, p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as
$$ insert into public.audit_logs (user_id, action, entity, entity_id, metadata) values (auth.uid(), p_action, p_entity, p_entity_id, p_meta) $$;

-- ---------- new user → profile (role is ALWAYS student) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare domains jsonb;
begin
  domains := public.setting('allowed_email_domains');
  if domains is not null and jsonb_typeof(domains) = 'array' and jsonb_array_length(domains) > 0
     and not exists (select 1 from jsonb_array_elements_text(domains) d where lower(new.email) like '%@' || lower(d)) then
    raise exception 'Please use your college email address.';
  end if;
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into public.student_details (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can never promote themselves
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role; new.status := old.status; new.email := old.email;
    new.department_id := old.department_id; new.id := old.id;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- ticket business logic (triggers) ----------
create or replace function public.tickets_bi() returns trigger
language plpgsql security definer set search_path = public as $$
declare hrs int; mx text; mxs int; mys int; auto boolean;
begin
  if auth.uid() is not null and not public.is_staff() then
    new.student_id := auth.uid();
    new.status := 'open'; new.assigned_to := null; new.tags := '{}';
    new.resolution := null; new.rating := null;
    -- priority abuse guard: clamp to the highest priority students may pick
    mx := trim(both '"' from coalesce(public.setting('max_student_priority')::text, '"high"'));
    select sort into mxs from public.priorities where key = mx;
    select sort into mys from public.priorities where key = new.priority;
    if mxs is not null and mys > mxs then new.priority := mx; end if;
  end if;
  new.ticket_number := 'TKT-' || to_char(new.created_at, 'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text, 6, '0');
  select sla_hours into hrs from public.priorities where key = new.priority;
  new.sla_deadline := new.created_at + make_interval(hours => coalesce(hrs, 24));
  auto := coalesce((public.setting('auto_assign_enabled'))::text::boolean, true);
  if new.assigned_to is null and auto then
    select default_assignee into new.assigned_to from public.categories where id = new.category_id;
  end if;
  if new.assigned_to is not null and new.status = 'open' then new.status := 'assigned'; end if;
  return new;
end $$;
create trigger tickets_before_insert before insert on public.tickets
  for each row execute function public.tickets_bi();

create or replace function public.tickets_ai() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.assigned_to is not null then
    insert into public.assignments (ticket_id, assigned_to, assigned_by) values (new.id, new.assigned_to, auth.uid());
    perform public.notify(new.assigned_to, new.id, 'ticket_assigned');
  end if;
  perform public.notify(new.student_id, new.id, 'ticket_created');
  if new.priority in ('high','urgent') then
    for a in select id from public.profiles where role = 'admin' and status = 'active' and id is distinct from new.assigned_to loop
      perform public.notify(a.id, new.id, 'high_priority', 'alert');
    end loop;
  end if;
  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (coalesce(auth.uid(), new.student_id), 'ticket.create', 'ticket', new.ticket_number, jsonb_build_object('priority', new.priority));
  return new;
end $$;
create trigger tickets_after_insert after insert on public.tickets
  for each row execute function public.tickets_ai();

create or replace function public.tickets_bu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.id := old.id; new.ticket_number := old.ticket_number; new.student_id := old.student_id;
  if new.status is distinct from old.status then
    if new.status = 'resolved' then new.resolved_at := coalesce(new.resolved_at, now()); end if;
    if new.status = 'closed' then new.closed_at := coalesce(new.closed_at, now()); end if;
    if new.status = 'reopened' then new.resolved_at := null; new.closed_at := null; end if;
  end if;
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null
     and new.status in ('open','reopened') then
    new.status := 'assigned';
  end if;
  if new.priority is distinct from old.priority then
    new.sla_deadline := new.created_at + make_interval(hours => coalesce((select sla_hours from public.priorities where key = new.priority), 24));
    new.sla_notified := false;
  end if;
  return new;
end $$;
create trigger tickets_before_update before update on public.tickets
  for each row execute function public.tickets_bu();

create or replace function public.tickets_au() returns trigger
language plpgsql security definer set search_path = public as $$
declare lbl_old text; lbl_new text; tplkey text;
begin
  if new.status is distinct from old.status then
    select label into lbl_old from public.statuses where key = old.status;
    select label into lbl_new from public.statuses where key = new.status;
    insert into public.ticket_messages (ticket_id, sender_id, body, kind)
      values (new.id, auth.uid(), 'Status changed: ' || coalesce(lbl_old, old.status) || ' → ' || coalesce(lbl_new, new.status), 'system');
    tplkey := case new.status when 'resolved' then 'ticket_resolved' when 'closed' then 'ticket_closed' when 'reopened' then 'ticket_reopened' else 'status_changed' end;
    if new.status = 'reopened' then
      perform public.notify(new.assigned_to, new.id, 'ticket_reopened', 'alert');
    end if;
    perform public.notify(new.student_id, new.id, tplkey);
    insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
      values (auth.uid(), 'ticket.status', 'ticket', new.ticket_number, jsonb_build_object('from', lbl_old, 'to', lbl_new));
  end if;
  if new.priority is distinct from old.priority then
    insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
      values (auth.uid(), 'ticket.priority', 'ticket', new.ticket_number, jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.assignments (ticket_id, assigned_from, assigned_to, assigned_by)
      values (new.id, old.assigned_to, new.assigned_to, auth.uid());
    if new.assigned_to is not null then
      perform public.notify(new.assigned_to, new.id, 'ticket_assigned');
      perform public.notify(new.student_id, new.id, 'assigned_student');
    end if;
    insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
      values (auth.uid(), 'ticket.assign', 'ticket', new.ticket_number, jsonb_build_object('to', new.assigned_to));
  end if;
  return new;
end $$;
create trigger tickets_after_update after update on public.tickets
  for each row execute function public.tickets_au();

create or replace function public.messages_bi() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tickets; staff boolean;
begin
  select * into t from public.tickets where id = new.ticket_id;
  select role in ('faculty','admin') into staff from public.profiles where id = new.sender_id;
  if new.kind = 'reply' and not coalesce(staff, false) and t.status = 'closed' then
    raise exception 'This ticket is closed. Please raise a new ticket or reopen it.';
  end if;
  return new;
end $$;
create trigger messages_before_insert before insert on public.ticket_messages
  for each row execute function public.messages_bi();

create or replace function public.messages_ai() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tickets; staff boolean;
begin
  if new.kind <> 'reply' then return new; end if;
  select * into t from public.tickets where id = new.ticket_id;
  select role in ('faculty','admin') into staff from public.profiles where id = new.sender_id;
  if coalesce(staff, false) then
    update public.tickets set first_response_at = coalesce(first_response_at, new.created_at),
      status = case when status in ('open','assigned') then 'in_progress' else status end
      where id = t.id;
    perform public.notify(t.student_id, t.id, 'reply_staff');
  else
    perform public.notify(t.assigned_to, t.id, 'reply_student');
    if t.status = 'waiting_student' then
      update public.tickets set status = 'in_progress' where id = t.id;
    else
      update public.tickets set updated_at = now() where id = t.id;
    end if;
  end if;
  insert into public.audit_logs (user_id, action, entity, entity_id)
    values (new.sender_id, 'ticket.reply', 'ticket', t.ticket_number);
  return new;
end $$;
create trigger messages_after_insert after insert on public.ticket_messages
  for each row execute function public.messages_ai();

-- Student confirms resolution (→ closed, with rating) or reopens
create or replace function public.student_respond(p_ticket uuid, p_action text, p_rating int default null, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tickets;
begin
  select * into t from public.tickets where id = p_ticket and student_id = auth.uid();
  if not found then raise exception 'Ticket not found.'; end if;
  if t.status <> 'resolved' then raise exception 'Only resolved tickets can be confirmed or reopened.'; end if;
  if p_action = 'confirm' then
    update public.tickets set status = 'closed', rating = p_rating, rating_comment = nullif(p_comment, '') where id = p_ticket;
  elsif p_action = 'reopen' then
    update public.tickets set status = 'reopened' where id = p_ticket;
    if coalesce(p_comment,'') <> '' then
      insert into public.ticket_messages (ticket_id, sender_id, body, kind) values (p_ticket, auth.uid(), p_comment, 'reply');
    end if;
  else
    raise exception 'Unknown action.';
  end if;
end $$;
grant execute on function public.student_respond(uuid, text, int, text) to authenticated;

-- Scheduled job: auto-close stale resolved tickets + flag overdue SLA
create or replace function public.sweep_tickets() returns jsonb
language plpgsql security definer set search_path = public as $$
declare days int; closed_n int := 0; overdue_n int := 0; r record;
begin
  days := coalesce(public.setting('auto_close_days')::text::int, 7);
  for r in select id from public.tickets where status = 'resolved' and resolved_at < now() - make_interval(days => days) loop
    update public.tickets set status = 'closed' where id = r.id;
    closed_n := closed_n + 1;
  end loop;
  for r in select id, assigned_to from public.tickets
           where first_response_at is null and not sla_notified and sla_deadline < now()
             and status not in ('resolved','closed') loop
    if r.assigned_to is not null then
      perform public.notify(r.assigned_to, r.id, 'sla_overdue', 'alert');
    else
      perform public.notify(p.id, r.id, 'sla_overdue', 'alert') from public.profiles p where p.role = 'admin';
    end if;
    update public.tickets set sla_notified = true where id = r.id;
    overdue_n := overdue_n + 1;
  end loop;
  return jsonb_build_object('auto_closed', closed_n, 'overdue_flagged', overdue_n);
end $$;
revoke execute on function public.sweep_tickets() from public, anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.departments enable row level security;
alter table public.programs enable row level security;
alter table public.statuses enable row level security;
alter table public.priorities enable row level security;
alter table public.settings enable row level security;
alter table public.notification_templates enable row level security;
alter table public.profiles enable row level security;
alter table public.student_details enable row level security;
alter table public.faculty_details enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.attachments enable row level security;
alter table public.assignments enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.announcements enable row level security;
alter table public.kb_articles enable row level security;
alter table public.saved_views enable row level security;
alter table public.audit_logs enable row level security;

-- config tables: everyone signed-in reads, only admin writes
do $$
declare tbl text;
begin
  foreach tbl in array array['departments','programs','statuses','priorities','settings','notification_templates','categories','subcategories'] loop
    execute format('create policy "%1$s read" on public.%1$s for select to authenticated using (true)', tbl);
    execute format('create policy "%1$s admin write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  end loop;
end $$;

-- profiles: students see only themselves + staff names; staff see everyone
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or role in ('faculty','admin') or public.is_staff());
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "profiles admin delete" on public.profiles for delete to authenticated using (public.is_admin());

create policy "student_details read" on public.student_details for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "student_details admin write" on public.student_details for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "faculty_details read" on public.faculty_details for select to authenticated using (true);
create policy "faculty_details write" on public.faculty_details for all to authenticated
  using (public.is_admin() or user_id = auth.uid()) with check (public.is_admin() or user_id = auth.uid());

-- tickets
create policy "tickets student read" on public.tickets for select to authenticated using (student_id = auth.uid());
create policy "tickets staff read" on public.tickets for select to authenticated using (
  public.is_admin() or (public.is_staff() and (
    assigned_to = auth.uid() or assigned_to is null
    or exists (select 1 from public.categories c where c.id = tickets.category_id
               and (c.department_id is null or c.department_id = public.my_dept())))));
create policy "tickets student create" on public.tickets for insert to authenticated
  with check (student_id = auth.uid() and public.my_role() = 'student');
create policy "tickets staff update" on public.tickets for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "tickets admin delete" on public.tickets for delete to authenticated using (public.is_admin());

-- messages (internal notes never reach students)
create policy "messages read" on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id) and (kind <> 'internal' or public.is_staff()));
create policy "messages insert" on public.ticket_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id)
              and (kind = 'reply' or (kind = 'internal' and public.is_staff())));

create policy "attachments read" on public.attachments for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id)
         and (message_id is null or exists (select 1 from public.ticket_messages m where m.id = message_id)));
create policy "attachments insert" on public.attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id));

create policy "assignments read" on public.assignments for select to authenticated using (public.is_staff());

create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push own" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "announcements read" on public.announcements for select to authenticated
  using (public.is_staff() or (starts_at <= now() and (expires_at is null or expires_at > now())));
create policy "announcements staff write" on public.announcements for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "kb read" on public.kb_articles for select to authenticated using (published or public.is_staff());
create policy "kb staff write" on public.kb_articles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "saved_views own" on public.saved_views for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());

-- ---------- file storage (private bucket, folder per ticket) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('ticket-files', 'ticket-files', false, 10485760)
on conflict (id) do nothing;

create policy "ticket files read" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-files' and exists (select 1 from public.tickets t where t.id::text = (storage.foldername(name))[1]));
create policy "ticket files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-files' and exists (select 1 from public.tickets t where t.id::text = (storage.foldername(name))[1]));

-- ---------- realtime (live notifications & chat) ----------
alter publication supabase_realtime add table public.notifications, public.ticket_messages, public.tickets;
