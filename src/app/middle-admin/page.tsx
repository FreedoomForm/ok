import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Middle Admin',
  robots: { index: false, follow: false },
}

const AdminDashboardPage = dynamic(
  () => import('@/components/admin/AdminDashboardPage'),
)

export default function MiddleAdminPage() {
  return <AdminDashboardPage mode="middle" />
}
