import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import { APP_NAME, ORG_NAME } from '@/lib/utils';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const p = await getProfile();
  if (p && p.status === 'active') redirect('/');
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/login-logo.png" alt={APP_NAME} className="mx-auto mb-3 h-44 w-44 rounded-3xl object-cover" />
          <h1 className="sr-only">{APP_NAME}</h1>
          <p className="text-sm text-muted">{ORG_NAME} · Student &amp; Faculty Support Desk</p>
        </div>
        {searchParams.error === 'disabled' && (
          <p className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950 dark:text-red-100" role="alert">
            Your account has been disabled. Please contact the administrator.
          </p>
        )}
        <LoginForm googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true'} />
      </div>
    </div>
  );
}
