import { cache } from 'react';
import { supabaseServer } from '@/lib/supabase/server';
import type { Category, Priority, Status, Subcategory } from '@/lib/types';

/** Everything an admin can change lives in the database; this loads it once per request. */
export const getConfig = cache(async () => {
  const supabase = supabaseServer();
  const [st, pr, ca, su, se] = await Promise.all([
    supabase.from('statuses').select('*').order('sort'),
    supabase.from('priorities').select('*').order('sort'),
    supabase.from('categories').select('*').order('sort'),
    supabase.from('subcategories').select('*').order('name'),
    supabase.from('settings').select('key,value'),
  ]);
  const settings: Record<string, any> = {};
  (se.data ?? []).forEach((r: any) => (settings[r.key] = r.value));
  return {
    statuses: (st.data ?? []) as Status[],
    priorities: (pr.data ?? []) as Priority[],
    categories: (ca.data ?? []) as Category[],
    subcategories: (su.data ?? []) as Subcategory[],
    settings,
  };
});
