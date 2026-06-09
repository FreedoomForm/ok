import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Low Admin',
  robots: { index: false, follow: false },
}

const AdminDashboardPage = dynamic(
  () => import('@/components/admin/AdminDashboardPage'),
)

export default function LowAdminPage() {
  return <AdminDashboardPage mode="low" />
}
