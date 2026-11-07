import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Runs daily (see vercel.json): closes stale "Resolved" tickets and flags overdue SLAs. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { data, error } = await supabaseAdmin().rpc('sweep_tickets');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...(data as object) });
}
