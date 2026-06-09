import type { Metadata } from 'next'
import { Suspense } from 'react'
import AdminDashboardPage from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Low Admin',
  robots: { index: false, follow: false },
}

export default function LowAdminPage() {
  return (
    <Suspense>
      <AdminDashboardPage mode="low" />
    </Suspense>
  )
}
