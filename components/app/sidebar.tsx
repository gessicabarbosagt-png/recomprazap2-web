'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Users,
  Package,
  RefreshCw,
  LogOut,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/ciclos', label: 'Ciclos de Recompra', icon: RefreshCw },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r bg-card px-3 py-4">
      <div className="px-2 mb-6">
        <span className="text-xl font-bold">♻️ RecompraZap</span>
        {usuario && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{usuario.loja.nome}</p>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <span
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                pathname === href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <Separator className="my-3" />

      {usuario && (
        <div className="px-2 space-y-1">
          <p className="text-xs font-medium truncate">{usuario.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground mt-1 px-1"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      )}
    </aside>
  )
}
