import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { queryTickets } from '@/lib/tickets';
import { csvEscape } from '@/lib/utils';

export async function GET(request: Request) {
  const me = await getProfile();
  if (!me || me.role === 'student') return new NextResponse('Forbidden', { status: 403 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const supabase = supabaseServer();
  const { data, error } = await queryTickets(supabase, params, me, { all: true });
  if (error) return new NextResponse('Could not export tickets.', { status: 500 });

  const head = ['Ticket', 'Student', 'Student email', 'Category', 'Subject', 'Priority', 'Status', 'Assigned to', 'Course', 'Semester', 'Created', 'First response', 'Resolved', 'Closed', 'Rating'];
  const rows = (data as any[]).map((t) => [
    t.ticket_number, t.student?.full_name, t.student?.email, t.category?.name, t.subject, t.priority, t.status,
    t.assignee?.full_name, t.course, t.semester, t.created_at, t.first_response_at, t.resolved_at, t.closed_at, t.rating,
  ]);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
  await supabase.rpc('log_event', { p_action: 'export.tickets', p_entity: 'ticket', p_entity_id: String(rows.length) });
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
