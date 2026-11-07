import type { SupabaseClient } from '@supabase/supabase-js';
import { fileExt, safeFileName } from '@/lib/utils';

export interface UploadRules { maxMb: number; allowed: string[] }

export function validateFiles(files: File[], rules: UploadRules): string | null {
  for (const f of files) {
    if (!rules.allowed.includes(fileExt(f.name))) return `"${f.name}" is not an allowed file type (${rules.allowed.join(', ')}).`;
    if (f.size > rules.maxMb * 1024 * 1024) return `"${f.name}" is larger than ${rules.maxMb} MB.`;
  }
  return null;
}

/** Uploads straight from the browser to private storage, then records each file. */
export async function uploadAttachments(
  supabase: SupabaseClient,
  opts: { ticketId: string; messageId?: string | null; files: File[]; userId: string }
): Promise<string | null> {
  for (const f of opts.files) {
    const path = `${opts.ticketId}/${crypto.randomUUID()}-${safeFileName(f.name)}`;
    const up = await supabase.storage.from('ticket-files').upload(path, f, { contentType: f.type || undefined });
    if (up.error) return `Could not upload "${f.name}". Please try again.`;
    const ins = await supabase.from('attachments').insert({
      ticket_id: opts.ticketId,
      message_id: opts.messageId ?? null,
      file_name: f.name,
      path,
      file_type: f.type || fileExt(f.name),
      file_size: f.size,
      uploaded_by: opts.userId,
    });
    if (ins.error) return `Uploaded "${f.name}" but could not attach it to the ticket.`;
  }
  return null;
}
