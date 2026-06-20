'use client'

import { Sidebar } from './sidebar'
import { AuthGuard } from './auth-guard'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </AuthGuard>
  )
}
