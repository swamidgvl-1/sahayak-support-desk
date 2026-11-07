import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import type { Profile, Role } from '@/lib/types';

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
  return (data as Profile) ?? null;
});

export async function requireProfile(roles?: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.status === 'disabled') redirect('/login?error=disabled');
  if (roles && !roles.includes(profile.role)) redirect('/');
  return profile;
}

export const isStaff = (p: Profile) => p.role === 'faculty' || p.role === 'admin';
