import type { Metadata } from 'next'
import { Suspense } from 'react'
import AdminDashboardPage from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Middle Admin',
  robots: { index: false, follow: false },
}

export default function MiddleAdminPage() {
  return (
    <Suspense>
      <AdminDashboardPage mode="middle" />
    </Suspense>
  )
}
