'use client'

import { Sidebar } from './sidebar'
import { AuthGuard } from './auth-guard'
import { WaDisconnectedBanner } from './wa-disconnected-banner'
import { AdminNotificacoesBanner } from './admin-notificacoes-banner'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <WaDisconnectedBanner />
          <AdminNotificacoesBanner />
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
