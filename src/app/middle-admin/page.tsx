import type { Metadata } from 'next'
import AdminDashboardPage from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Middle Admin',
  robots: { index: false, follow: false },
}

export default function MiddleAdminPage() {
  return <AdminDashboardPage mode="middle" />
}
