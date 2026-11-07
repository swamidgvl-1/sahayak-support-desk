'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Mode = 'password' | 'otp' | 'signup';

function nice(msg: string) {
  if (/database error saving new user/i.test(msg)) return 'Please use your college email address to sign up.';
  if (/invalid login/i.test(msg)) return 'Incorrect email or password.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  if (/token has expired|invalid.*token|otp/i.test(msg)) return 'That code is wrong or has expired. Please request a new one.';
  return msg || 'Something went wrong. Please try again.';
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function done(supabase = supabaseBrowser()) {
    await supabase.rpc('log_event', { p_action: 'auth.login', p_entity: 'user' });
    router.replace('/');
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setInfo('');
    const supabase = supabaseBrowser();
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await done(supabase);
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) await done(supabase);
        else setInfo('Account created. Check your email and click the confirmation link, then sign in.');
      } else if (!codeSent) {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        setCodeSent(true);
        setInfo('We emailed you a 6-digit code. Enter it below.');
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (error) throw error;
        await done(supabase);
      }
    } catch (err: any) {
      setError(nice(err.message));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError('');
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(nice(error.message));
  }

  const tabs: [Mode, string][] = [['password', 'Password'], ['otp', 'Email code'], ['signup', 'Create account']];

  return (
    <div className="card p-5">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1" role="tablist">
        {tabs.map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button"
            onClick={() => { setMode(m); setError(''); setInfo(''); setCodeSent(false); }}
            className={cn('min-h-[38px] rounded-md text-sm font-medium', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3" noValidate>
        {mode === 'signup' && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">College email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
        </div>
        {(mode === 'password' || mode === 'signup') && (
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </div>
        )}
        {mode === 'otp' && codeSent && (
          <div>
            <label className="label" htmlFor="code">6-digit code</label>
            <input id="code" className="input tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={8} autoComplete="one-time-code" required />
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
        {info && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200" role="status">{info}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'password' ? 'Sign in' : mode === 'signup' ? 'Create account' : codeSent ? 'Verify code' : 'Email me a code'}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button className="btn w-full" type="button" onClick={google}>Continue with Google</button>
        </>
      )}
      <p className="mt-4 text-center text-xs text-muted">Faculty and admin access is granted by your administrator.</p>
    </div>
  );
}
