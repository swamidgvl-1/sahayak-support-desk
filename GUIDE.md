# Sahayak Support Desk — Setup & Rollout Guide

No Node/npm needed on your computer. You only need a browser and three free accounts: **Supabase** (database, login, files), **GitHub** (stores the code), **Vercel** (hosts the app).

## 1. Create the database (Supabase) — 10 min
1. supabase.com → New project (region: Mumbai/Singapore). Save the database password.
2. **SQL Editor → New query.** Paste and Run, in order:
   - `supabase/1_schema.sql`
   - `supabase/2_seed_config.sql`
   - `supabase/3_demo_data.sql` (optional demo users + 24 tickets; password `Demo@12345`)
3. **Project Settings → API**: copy the *Project URL*, the *anon/publishable key* and the *service_role key* (keep this one secret).

## 2. Put the code on GitHub — 5 min
1. Unzip `sahayak-support-desk.zip`.
2. github.com → New repository (Private) → "uploading an existing file" → drag **all contents** of the unzipped folder in → Commit.
   (GitHub accepts ~100 files per upload; if it complains, upload folder by folder.)

## 3. Deploy (Vercel) — 5 min
1. vercel.com → sign in with GitHub → Add New → Project → pick your repo → Framework: Next.js.
2. Environment Variables (from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` = any long random text
   - `NEXT_PUBLIC_APP_NAME` = Sahayak, `NEXT_PUBLIC_ORG_NAME` = your college
3. Deploy. You get a link like `https://yourapp.vercel.app`.
4. Back in Supabase → **Authentication → URL Configuration**: set *Site URL* to that link and add `https://yourapp.vercel.app/**` under Redirect URLs.
5. Add env var `NEXT_PUBLIC_SITE_URL` = that link, then Redeploy.

(Netlify/Render also work: build `npm install && npm run build`, start `npm start`. Supabase only provides database/login/files, not hosting.)

## 4. Become admin — 2 min
1. Open your site → **Create account** with your email.
2. Supabase SQL Editor: `update profiles set role='admin' where email='you@college.edu';`
3. Sign out and in. You now see the **Admin** menu. (With demo data you can use `admin@demo.example`.)

## 5. Configure for your college — 20 min (Admin menu)
- **Statuses, SLA & Settings**: set `allowed_email_domains` to `["yourcollege.edu"]` **before sharing the link**; adjust SLA hours, `auto_close_days`, `max_file_mb`.
- **Categories & Departments**: edit categories/subcategories; set a **Default assignee** per category (this is auto-assignment).
- **Users → Add a user**: create faculty/coordinators (role Faculty). **Import students (CSV)**: `email, name, student ID, program, semester, division, year` (max 200 per paste).
- **Notification templates**: edit wording.
- Delete demo users before launch: SQL `delete from auth.users where email like '%@demo.example';`

## 6. Login for students
- **Google sign-in** (recommended if college uses Google): Supabase → Authentication → Providers → Google (needs a Google Cloud OAuth client; redirect URL shown by Supabase). Then set `NEXT_PUBLIC_GOOGLE_ENABLED=true` in Vercel and redeploy.
- **Email code (OTP)**: Supabase → Authentication → Email Templates → *Magic Link*: add `{{ .Token }}` to the text.
- **Important:** Supabase's built-in email allows only a few emails per hour. For 1,000 students set up **custom SMTP** (Authentication → SMTP Settings; Resend or Brevo free tier) before launch.

## 7. Test before launch (15 min)
1. Student: raise ticket with a screenshot → see ticket number.
2. Faculty (other browser): see it on dashboard → reply → add an **internal note** → Resolve.
3. Student: sees reply + notification, **not** the internal note → confirm & rate.
4. As a student, paste another student's ticket URL → must show "not found".
5. Admin: check Audit log and Analytics.

## 8. Roll out to students
- Share the link by WhatsApp/email/QR code with: "Raise tickets here instead of WhatsApp or calls."
- **Install as an app**: Android Chrome → ⋮ → *Install app*. iPhone Safari → Share → *Add to Home Screen*.
- Post an Announcement (Staff → Announcements) and run a 10-minute demo for faculty.
- Faculty daily routine: open Dashboard → clear *Overdue* and *Unassigned* → reply/resolve.

## 9. Managing data
- Everything lives in your Supabase project (Table Editor shows all tables).
- Tickets: Staff → Tickets → **Export CSV** (opens in Excel).
- Backups: Supabase free plan has none automatically; export key tables monthly (Table Editor → Export) or upgrade to Pro.
- Free plan pauses after 7 idle days; the app's daily scheduled job keeps it active.
- New semester: SQL `update student_details set semester = semester + 1;` (adjust by program).
- Remove a leaver: Admin → Users → set *Disabled*.
- Capacity: free tier comfortably handles ~1,000 students.

## 10. Optional extras
- **Email notifications**: Resend account → add `RESEND_API_KEY`, `EMAIL_FROM` in Vercel; Supabase → Database → Webhooks → table `notifications`, INSERT, POST to `https://yourapp.vercel.app/api/notify` with header `x-webhook-secret: <CRON_SECRET>`.
- **Push notifications**: needs VAPID keys. Paste in browser console on any page:
  `(async()=>{const k=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);const p=new Uint8Array(await crypto.subtle.exportKey('raw',k.publicKey));const j=await crypto.subtle.exportKey('jwk',k.privateKey);console.log('PUBLIC:',btoa(String.fromCharCode(...p)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));console.log('PRIVATE:',j.d)})()`
  Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in Vercel, redeploy, then users tap *Enable* on Profile. Also needs the webhook above.
- **Custom domain**: Vercel → Settings → Domains.

## 11. Updating the app
Edit files on GitHub (pencil icon) → Commit; Vercel redeploys automatically.

## Troubleshooting
| Problem | Fix |
|---|---|
| Vercel build fails | Open the build log, send me the error text |
| "Please use your college email" | Email not in `allowed_email_domains` |
| Login redirects back to login | Supabase Site URL / Redirect URLs not set (step 3.4) |
| OTP email not arriving | Set up custom SMTP (step 6) |
| Admin menu missing | Re-run the promote SQL (step 4), sign out/in |
| Create user / CSV import fails | `SUPABASE_SERVICE_ROLE_KEY` missing in Vercel |
| Uploads fail | Check file type/size in Settings; bucket `ticket-files` exists (created by schema SQL) |

## Not included yet
SMS/WhatsApp (add later via `/api/notify`), AI features (schema is ready for them), ERP sync.
