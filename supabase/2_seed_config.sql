-- =====================================================================
-- Starter configuration. Run SECOND. Everything here can be edited later
-- from the Admin panel — nothing is hard-coded in the app.
-- =====================================================================
insert into public.departments (name) values
  ('Administration'), ('Examination Cell'), ('ERP & IT'), ('Academics'), ('Library'), ('Accounts'), ('PhD Cell');

insert into public.programs (name) values
  ('MBA'), ('BBA'), ('MCA'), ('B.Tech'), ('M.Tech'), ('PhD');

insert into public.statuses (key, label, kind, sort, is_system) values
  ('open','Open','open',1,true),
  ('assigned','Assigned','open',2,true),
  ('in_progress','In Progress','active',3,true),
  ('waiting_student','Waiting for Student','waiting',4,true),
  ('waiting_department','Waiting for Department','waiting',5,true),
  ('resolved','Resolved','resolved',6,true),
  ('closed','Closed','closed',7,true),
  ('reopened','Reopened','open',8,true);

insert into public.priorities (key, label, sla_hours, sort, student_selectable) values
  ('low','Low',48,1,true),
  ('medium','Medium',24,2,true),
  ('high','High',8,3,true),
  ('urgent','Urgent',2,4,true);

insert into public.settings (key, value, description) values
  ('auto_assign_enabled', 'true', 'Assign tickets to the category''s default assignee automatically'),
  ('auto_close_days', '7', 'Days after "Resolved" before a ticket closes by itself'),
  ('max_student_priority', '"high"', 'Highest priority a student may choose (low, medium, high, urgent)'),
  ('max_file_mb', '10', 'Maximum attachment size in MB'),
  ('allowed_file_types', '["jpg","jpeg","png","webp","pdf","doc","docx","xls","xlsx"]', 'Allowed attachment extensions'),
  ('allowed_email_domains', '[]', 'Only these email domains may sign up, e.g. ["mgmu.ac.in"]. Empty = anyone.'),
  ('sla_warning_percent', '25', 'Show "approaching deadline" when this % of SLA time is left');

insert into public.notification_templates (key, title, body) values
  ('ticket_created',   'Ticket {{ticket}} created', 'We received "{{subject}}". You can track it from My Tickets.'),
  ('assigned_student', 'Ticket {{ticket}} assigned', 'Your ticket has been assigned and will be looked at soon.'),
  ('ticket_assigned',  'New ticket assigned: {{ticket}}', '"{{subject}}" needs your attention.'),
  ('reply_staff',      'New reply on {{ticket}}', 'Support has replied to "{{subject}}".'),
  ('reply_student',    'Student replied on {{ticket}}', 'The student replied on "{{subject}}".'),
  ('status_changed',   'Ticket {{ticket}} is now {{status}}', 'The status of "{{subject}}" changed to {{status}}.'),
  ('ticket_resolved',  'Your ticket {{ticket}} has been resolved', 'Please confirm that the issue is fixed, or reopen the ticket.'),
  ('ticket_closed',    'Ticket {{ticket}} closed', '"{{subject}}" is now closed. Thank you!'),
  ('ticket_reopened',  'Ticket {{ticket}} reopened', '"{{subject}}" was reopened by the student.'),
  ('high_priority',    'High-priority ticket {{ticket}}', '"{{subject}}" was raised as high priority.'),
  ('sla_overdue',      'SLA overdue: {{ticket}}', '"{{subject}}" has passed its response deadline.');

-- categories (icon = lucide icon name)
with d as (select name, id from public.departments)
insert into public.categories (name, description, icon, department_id, sort)
select c.name, c.description, c.icon, (select id from d where d.name = c.dept), c.sort from (values
  ('ERP','Login, marks, exam form, profile in ERP','monitor','ERP & IT',1),
  ('Attendance','Attendance missing or incorrect','calendar-check','Academics',2),
  ('Assignment','Submission, deadlines, evaluation','file-text','Academics',3),
  ('Examination','Hall ticket, results, revaluation','graduation-cap','Examination Cell',4),
  ('Internal Assessment','Internal marks and evaluation','clipboard-list','Academics',5),
  ('Course/Subject','Subject allocation, electives','book-open','Academics',6),
  ('Certificate','Bonafide, transcripts, degree','award','Administration',7),
  ('Fees','Payments, receipts, concessions','indian-rupee','Accounts',8),
  ('ID Card','New, lost or damaged ID card','id-card','Administration',9),
  ('Timetable','Clashes or changes in timetable','clock','Academics',10),
  ('Library','Books, fines, access','library','Library',11),
  ('Technical Support','Wi-Fi, LMS, email, software','wrench','ERP & IT',12),
  ('Faculty/Academic Support','Academic guidance or faculty help','user-round','Academics',13),
  ('PhD Coordination','RAC, progress reports, PhD queries','flask-conical','PhD Cell',14),
  ('Other','Anything else','help-circle','Administration',15)
) as c(name, description, icon, dept, sort);

insert into public.subcategories (category_id, name)
select c.id, s.name from public.categories c join (values
  ('ERP','Attendance not updated'),('ERP','Marks not visible'),('ERP','Subject missing'),('ERP','Login issue'),('ERP','Exam form issue'),('ERP','Profile correction'),('ERP','Other'),
  ('Attendance','Attendance not showing'),('Attendance','Wrong attendance'),('Attendance','Medical / leave adjustment'),('Attendance','Other'),
  ('Assignment','Unable to submit'),('Assignment','Marks not received'),('Assignment','Deadline extension'),('Assignment','Other'),
  ('Examination','Hall ticket'),('Examination','Result query'),('Examination','Revaluation'),('Examination','Exam form'),('Examination','Other'),
  ('Internal Assessment','Marks missing'),('Internal Assessment','Marks incorrect'),('Internal Assessment','Other'),
  ('Course/Subject','Wrong subject allotted'),('Course/Subject','Elective change'),('Course/Subject','Other'),
  ('Certificate','Bonafide certificate'),('Certificate','Transcript'),('Certificate','Degree certificate'),('Certificate','Other'),
  ('Fees','Payment not reflected'),('Fees','Receipt needed'),('Fees','Concession / scholarship'),('Fees','Other'),
  ('ID Card','New ID card'),('ID Card','Lost ID card'),('ID Card','Details incorrect'),
  ('Timetable','Clash in timetable'),('Timetable','Timetable not available'),('Timetable','Other'),
  ('Library','Book not available'),('Library','Fine query'),('Library','Library access'),
  ('Technical Support','Wi-Fi'),('Technical Support','LMS access'),('Technical Support','College email'),('Technical Support','Other'),
  ('Faculty/Academic Support','Need guidance'),('Faculty/Academic Support','Meeting request'),('Faculty/Academic Support','Other'),
  ('PhD Coordination','RAC report'),('PhD Coordination','Supervisor change'),('PhD Coordination','Other'),
  ('Other','General query')
) as s(cat, name) on s.cat = c.name;

insert into public.kb_articles (category_id, question, answer)
select (select id from public.categories where name = k.cat), k.q, k.a from (values
  ('ERP','How do I reset my ERP password?','Use "Forgot password" on the ERP login page. If the reset email does not arrive in 10 minutes, raise a ticket under ERP → Login issue.'),
  ('ERP','Why is my attendance not showing in ERP?','Attendance is synced after faculty submits it for the day. Wait 24 hours; if it is still missing, raise a ticket with a screenshot of the ERP attendance page.'),
  ('ERP','How do I fill the examination form?','Open ERP → Examination → Exam Form, verify your subjects, pay the fee (if applicable) and click Submit. Keep the confirmation PDF.'),
  ('Fees','I paid my fees but the receipt is missing','Online payments can take up to 48 hours to reflect. Raise a ticket under Fees → Payment not reflected with the transaction ID.'),
  ('Certificate','How do I get a bonafide certificate?','Raise a ticket under Certificate → Bonafide certificate and state the purpose. It is usually ready in 2 working days.'),
  ('Internal Assessment','Why can''t I see my internal marks?','Internal marks become visible after the department publishes them. If your exam is over a week ago, raise a ticket.')
) as k(cat, q, a);

insert into public.announcements (title, body, priority, expires_at) values
  ('Welcome to the Support Desk', 'Raise a ticket here instead of WhatsApp or phone calls so nothing gets lost. Check the Help Centre first — your answer may already be there.', 'normal', null);
