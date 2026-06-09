import type { Metadata } from 'next'
import AdminDashboardPage from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Low Admin',
  robots: { index: false, follow: false },
}

export default function LowAdminPage() {
  return <AdminDashboardPage mode="low" />
}
