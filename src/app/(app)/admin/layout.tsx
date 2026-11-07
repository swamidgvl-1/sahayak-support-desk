import AdminTabs from './Tabs';
import { requireProfile } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(['admin']);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <AdminTabs />
      {children}
    </div>
  );
}
