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
  MessageSquare,
  GitBranch,
  Settings,
  LogOut,
  Tag,
  KanbanSquare,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/ciclos', label: 'Ciclos de Recompra', icon: RefreshCw },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
  { href: '/fluxo', label: 'Fluxo de Conversa', icon: GitBranch },
  { href: '/jornada', label: 'Jornada de Compra', icon: KanbanSquare },
  { href: '/codigos-origem', label: 'Origem de Leads', icon: Tag },
]

const navBottom = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r bg-card px-3 py-4">
      <div className="px-2 mb-6">
        <span className="text-xl font-bold">♻️ RecompraZap</span>
        {usuario?.loja && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{usuario.loja.nome}</p>
        )}
        {usuario?.role === 'admin' && (
          <p className="text-xs text-primary mt-1 font-medium">Administrador</p>
        )}
      </div>

      {usuario?.role === 'admin' ? (
        <div className="flex-1 flex flex-col gap-0">
          <nav className="space-y-1">
            {[
              { href: '/admin', label: 'Painel Admin', icon: ShieldCheck },
              { href: '/admin/lojas', label: 'Lojas', icon: ShoppingBag },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    pathname === href || (href !== '/admin' && pathname.startsWith(href))
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

          {usuario.loja && (
            <>
              <Separator className="my-3" />
              <p className="px-3 text-xs text-muted-foreground font-medium mb-1 truncate">{usuario.loja.nome}</p>
              <nav className="space-y-1">
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
            </>
          )}
        </div>
      ) : (
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
      )}

      <nav className="space-y-1 mb-1">
        {navBottom.map(({ href, label, icon: Icon }) => (
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
