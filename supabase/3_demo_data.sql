-- =====================================================================
-- OPTIONAL demo data (run THIRD, only to try the app out).
-- Creates demo users + 24 tickets. Delete them before real use:
--   delete from auth.users where email like '%@demo.example';
-- Demo password for everyone: Demo@12345
-- =====================================================================
do $$
declare
  u record; uid uuid;
  rahul uuid; sneha uuid; amit uuid; swami uuid; erp uuid; exam uuid; adm uuid;
  studs uuid[]; i int; t record; tid uuid; cat uuid; sub uuid; assignee uuid; stud uuid;
  created timestamptz;
begin
  -- 1) users ----------------------------------------------------------
  for u in select * from (values
    ('rahul.patil@demo.example','Rahul Patil'),('sneha.sharma@demo.example','Sneha Sharma'),('amit.joshi@demo.example','Amit Joshi'),
    ('swami.dandgaval@demo.example','Swami Dandgaval'),('erp.coordinator@demo.example','ERP Coordinator'),
    ('exam.coordinator@demo.example','Examination Coordinator'),('admin@demo.example','Demo Admin')
  ) as x(email, name) loop
    uid := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated','authenticated', u.email, crypt('Demo@12345', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(), '', '', '', '');
    insert into auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', u.email), 'email', now(), now(), now());
  end loop;

  select id into rahul from public.profiles where email='rahul.patil@demo.example';
  select id into sneha from public.profiles where email='sneha.sharma@demo.example';
  select id into amit  from public.profiles where email='amit.joshi@demo.example';
  select id into swami from public.profiles where email='swami.dandgaval@demo.example';
  select id into erp   from public.profiles where email='erp.coordinator@demo.example';
  select id into exam  from public.profiles where email='exam.coordinator@demo.example';
  select id into adm   from public.profiles where email='admin@demo.example';

  update public.profiles set role='faculty', department_id=(select id from public.departments where name='Academics') where id = swami;
  update public.profiles set role='faculty', department_id=(select id from public.departments where name='ERP & IT') where id = erp;
  update public.profiles set role='faculty', department_id=(select id from public.departments where name='Examination Cell') where id = exam;
  update public.profiles set role='admin' where id = adm;
  insert into public.faculty_details (user_id, employee_id, designation) values
    (swami,'EMP-101','Assistant Professor'),(erp,'EMP-102','ERP Coordinator'),(exam,'EMP-103','Examination Coordinator'),(adm,'EMP-100','System Administrator')
  on conflict (user_id) do nothing;
  delete from public.student_details where user_id in (swami, erp, exam, adm);

  update public.student_details set student_code='MBA2026-001', program='MBA', semester=3, division='A', academic_year='2026-27' where user_id=rahul;
  update public.student_details set student_code='MBA2026-002', program='MBA', semester=3, division='A', academic_year='2026-27' where user_id=sneha;
  update public.student_details set student_code='MCA2026-014', program='MCA', semester=1, division='B', academic_year='2026-27' where user_id=amit;

  -- 2) default assignees (auto-assignment) -------------------------------
  update public.categories set default_assignee = erp  where name in ('ERP','Technical Support');
  update public.categories set default_assignee = exam where name in ('Examination');
  update public.categories set default_assignee = swami where name in ('Attendance','Assignment','Internal Assessment','Course/Subject','Faculty/Academic Support','Timetable');

  -- 3) tickets ------------------------------------------------------------
  studs := array[rahul, sneha, amit];
  i := 0;
  for t in select * from (values
    ('ERP','Attendance not updated','Attendance not updated in ERP','My attendance for Business Analytics is not showing in ERP since last week.','medium','open'),
    ('ERP','Login issue','Cannot log in to ERP','ERP says invalid credentials even after password reset.','high','in_progress'),
    ('ERP','Marks not visible','Unit test marks missing','Unit test 1 marks are not visible in my ERP login.','medium','waiting_student'),
    ('ERP','Exam form issue','Exam form submit button disabled','I cannot submit the semester exam form, the button stays grey.','urgent','assigned'),
    ('ERP','Profile correction','Wrong date of birth in ERP','My date of birth is wrong in the ERP profile.','low','resolved'),
    ('Attendance','Wrong attendance','Marked absent while present','I was present on 14 Oct for Marketing but marked absent.','medium','in_progress'),
    ('Attendance','Medical / leave adjustment','Medical leave attendance adjustment','Please adjust attendance for my medical leave 3–7 Oct (certificate attached).','high','waiting_department'),
    ('Assignment','Unable to submit','Assignment upload failing','The LMS gives an error when I upload the Finance assignment.','high','open'),
    ('Assignment','Deadline extension','Extension request for case study','Requesting 2 days extension for the HR case study due to illness.','low','closed'),
    ('Assignment','Marks not received','Assignment 2 marks not received','Marks for assignment 2 are still not shared.','medium','resolved'),
    ('Examination','Hall ticket','Hall ticket not generated','Hall ticket option is not available in ERP.','urgent','in_progress'),
    ('Examination','Result query','Result shows absent','My result shows absent for Operations though I appeared.','high','assigned'),
    ('Examination','Revaluation','Revaluation request','I want to apply for revaluation of Statistics.','medium','waiting_student'),
    ('Internal Assessment','Marks missing','Internal marks missing','Internal marks of Business Law are missing.','medium','closed'),
    ('Internal Assessment','Marks incorrect','Internal marks calculation wrong','Total internal marks look lower than the sum of components.','medium','reopened'),
    ('Technical Support','Wi-Fi','Campus Wi-Fi not connecting','Wi-Fi in the library block keeps disconnecting.','low','open'),
    ('Technical Support','College email','College email login blocked','My college email account is locked.','high','resolved'),
    ('Certificate','Bonafide certificate','Bonafide for bank loan','I need a bonafide certificate for an education loan.','medium','open'),
    ('Certificate','Transcript','Transcript request','Need official transcript for higher studies.','low','open'),
    ('Fees','Payment not reflected','Fee payment not reflected','Paid the fees on 2 Oct, money debited but ERP shows pending.','urgent','open'),
    ('ID Card','Lost ID card','Lost my ID card','Lost my ID card, need a duplicate.','low','closed'),
    ('Library','Fine query','Library fine seems wrong','I was charged a fine for a book I returned on time.','low','in_progress'),
    ('Faculty/Academic Support','Meeting request','Meeting request for project guidance','Would like a meeting about my capstone project topic.','medium','assigned'),
    ('Timetable','Clash in timetable','Two classes at the same time','Elective and core class overlap on Thursdays.','high','open')
  ) as x(cat, sub, subject, descr, prio, st) loop
    i := i + 1;
    stud := studs[1 + (i % 3)];
    created := now() - make_interval(hours => i * 9 + (i % 5));
    select id into cat from public.categories where name = t.cat;
    select id into sub from public.subcategories where category_id = cat and name = t.sub;
    select default_assignee into assignee from public.categories where id = cat;
    tid := gen_random_uuid();
    insert into public.tickets (id, student_id, category_id, subcategory_id, subject, description, priority, status, assigned_to,
                                course, semester, academic_year, created_at, first_response_at, resolved_at, closed_at, resolution, rating)
    values (tid, stud, cat, sub, t.subject, t.descr, t.prio, case when t.st='open' then 'open' else t.st end, case when t.st='open' then null else assignee end,
            (array['Business Analytics','Marketing','Finance','HR','Operations'])[1 + (i % 5)], '3', '2026-27', created,
            case when t.st in ('open','assigned') then null else created + interval '2 hours' end,
            case when t.st in ('resolved','closed') then created + interval '20 hours' end,
            case when t.st = 'closed' then created + interval '30 hours' end,
            case when t.st in ('resolved','closed') then 'Issue has been fixed. Please check again.' end,
            case when t.st = 'closed' then 3 + (i % 3) end);
    if t.st not in ('open','assigned') and assignee is not null then
      insert into public.ticket_messages (ticket_id, sender_id, body, kind, created_at) values
        (tid, assignee, 'Thanks for reporting this. I am looking into it — could you share a screenshot if possible?', 'reply', created + interval '2 hours'),
        (tid, assignee, 'Checked with the concerned team. Sync appears to have failed for this record.', 'internal', created + interval '3 hours');
    end if;
  end loop;
end $$;
