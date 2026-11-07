import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getConfig } from '@/lib/config';
import { NewTicketWizard } from './Wizard';

export const metadata = { title: 'Raise a ticket' };

export default async function NewTicket() {
  const me = await requireProfile(['student']);
  const supabase = supabaseServer();
  const cfg = await getConfig();
  const [{ data: details }, { data: kb }] = await Promise.all([
    supabase.from('student_details').select('semester, academic_year').eq('user_id', me.id).maybeSingle(),
    supabase.from('kb_articles').select('id, category_id, question, answer').eq('published', true),
  ]);
  const maxPrio = String(cfg.settings.max_student_priority ?? 'high');
  const maxSort = cfg.priorities.find((p) => p.key === maxPrio)?.sort ?? 99;
  return (
    <NewTicketWizard
      userId={me.id}
      categories={cfg.categories.filter((c) => c.active)}
      subcategories={cfg.subcategories.filter((s) => s.active)}
      priorities={cfg.priorities.filter((p) => p.student_selectable && p.sort <= maxSort)}
      kb={kb ?? []}
      defaults={{ semester: details?.semester ? String(details.semester) : '', academic_year: details?.academic_year ?? '' }}
      rules={{
        maxMb: Number(cfg.settings.max_file_mb ?? 10),
        allowed: (cfg.settings.allowed_file_types as string[]) ?? ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
      }}
    />
  );
}
