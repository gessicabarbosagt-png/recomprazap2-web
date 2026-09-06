'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useChecklist, CHECKLIST_ITENS } from '@/lib/checklist-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  BellOff,
  Clock,
  HelpCircle,
  CreditCard,
  CheckCircle2,
  Circle,
  ListChecks,
} from 'lucide-react'
import { ThemeToggle } from '@/components/app/theme-toggle'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/ciclos', label: 'Ciclos de Recompra', icon: RefreshCw },
  { href: '/represados', label: 'Lembretes Represados', icon: BellOff },
  { href: '/adiados', label: 'Adiados pelo Cliente', icon: Clock },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
  { href: '/fluxo', label: 'Fluxo de Conversa', icon: GitBranch },
  { href: '/jornada', label: 'Jornada de Compra', icon: KanbanSquare },
  { href: '/codigos-origem', label: 'Origem de Leads', icon: Tag },
]

const navBottom = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/plano', label: 'Meu Plano', icon: CreditCard },
  { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
]

function ChecklistWidget() {
  const { checklist } = useChecklist()

  if (!checklist || checklist.completo) return null

  const concluidos = CHECKLIST_ITENS.filter((i) => checklist[i.key]).length
  const total = CHECKLIST_ITENS.length
  const pct = Math.round((concluidos / total) * 100)

  return (
    <Popover>
      <PopoverTrigger
        className="w-full rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <ListChecks className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">
            Comece por aqui
          </span>
          <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
            {concluidos}/{total}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72 p-0">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold">Comece por aqui</p>
          <p className="text-xs text-muted-foreground">{concluidos} de {total} completos</p>
        </div>
        <ul className="p-2 space-y-0.5">
          {CHECKLIST_ITENS.map((item) => {
            const feito = checklist[item.key]
            const inner = (
              <li
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  feito
                    ? 'text-muted-foreground'
                    : 'hover:bg-muted/60 cursor-pointer font-medium',
                )}
              >
                {feito
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={feito ? 'line-through text-xs' : 'text-xs'}>{item.label}</span>
              </li>
            )
            return feito ? (
              <div key={item.key}>{inner}</div>
            ) : (
              <Link key={item.key} href={item.href}>{inner}</Link>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()

  return (
    <aside className="sticky top-0 h-screen flex flex-col w-60 border-r bg-card px-3 py-4 overflow-hidden">
      <div className="flex-shrink-0 px-2 mb-6">
        <span className="text-xl font-bold">♻️ RecompraZap</span>
        {usuario?.loja && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{usuario.loja.nome}</p>
        )}
        {usuario?.role === 'admin' && (
          <p className="text-xs text-primary mt-1 font-medium">Administrador</p>
        )}
      </div>

      {usuario?.role === 'admin' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
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
        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0">
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

      <nav className="flex-shrink-0 space-y-1 mb-1 mt-2">
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

      {/* Widget checklist — visível enquanto não completo */}
      <div className="flex-shrink-0 px-0 mb-2">
        <ChecklistWidget />
      </div>

      <Separator className="flex-shrink-0 my-3" />

      {usuario && (
        <div className="flex-shrink-0 px-2 space-y-1">
          <p className="text-xs font-medium truncate">{usuario.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground px-1"
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
