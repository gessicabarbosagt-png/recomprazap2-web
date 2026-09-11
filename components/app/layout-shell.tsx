'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { AuthGuard } from './auth-guard'
import { WaDisconnectedBanner } from './wa-disconnected-banner'
import { AdminNotificacoesBanner } from './admin-notificacoes-banner'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {/* Desktop sidebar – hidden below md */}
        <Sidebar className="hidden md:flex" />

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <Sidebar
              className="fixed inset-y-0 left-0 z-50 flex md:hidden shadow-xl"
              onNavigate={() => setMobileOpen(false)}
              mobileView
            />
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <div className="flex items-center border-b px-4 h-14 md:hidden flex-shrink-0 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="ml-2 font-semibold text-sm">RecompraZap</span>
          </div>
          <WaDisconnectedBanner />
          <AdminNotificacoesBanner />
          <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
