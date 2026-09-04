import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { getState } from '@/lib/store';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mission control' };

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect('/admin/login');
  return <AdminDashboard initial={await getState()} />;
}
