import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Optional. Point a Supabase Database Webhook (table: notifications, event: INSERT) at this URL
 * with the header  x-webhook-secret: <CRON_SECRET>  to also deliver each notification by email
 * (Resend) and Web Push. If neither is configured this route does nothing.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('x-webhook-secret') !== secret) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => null);
  const n = body?.record;
  if (!n?.user_id) return NextResponse.json({ ok: true, skipped: true });

  const svc = supabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const url = n.ticket_id ? `${siteUrl}/tickets/${n.ticket_id}` : siteUrl || '/';
  const results: Record<string, unknown> = {};

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const { data: p } = await svc.from('profiles').select('email, full_name').eq('id', n.user_id).maybeSingle();
    if (p?.email) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM, to: p.email, subject: n.title,
          html: `<p>Hi ${escapeHtml(p.full_name || '')},</p><p>${escapeHtml(n.message)}</p>${siteUrl ? `<p><a href="${url}">Open the ticket</a></p>` : ''}`,
        }),
      });
      results.email = r.ok;
    }
  }

  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const { data: subs } = await svc.from('push_subscriptions').select('id, subscription').eq('user_id', n.user_id);
    let sent = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title: n.title, body: n.message, url }));
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await svc.from('push_subscriptions').delete().eq('id', s.id);
      }
    }
    results.push = sent;
  }
  return NextResponse.json({ ok: true, ...results });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
