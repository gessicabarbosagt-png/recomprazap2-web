'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { Users, Package, RefreshCw, Bell, ShoppingBag, Tag, TrendingUp, CircleDollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Resumo {
  total: number
  enviados: number
  semResposta: number
  cancelados: number
}

interface ResumoPedidos {
  total: number
  pendentes: number
  confirmados: number
  entregues: number
  cancelados: number
}

interface OrigemResumo {
  origem: string
  total: number
}

interface ResumoJornada {
  totalPedidos: number
  totalCompras: number
  comprasSemValor: number
  receitaConfirmada: number
}

const PERIODOS = [
  { label: '7d', dias: 7 },
  { label: '30d', dias: 30 },
  { label: '90d', dias: 90 },
]

const ORIGEM_LABELS: Record<string, string> = {
  meta_ads:    'Meta Ads',
  importado:   'Importado',
  sem_origem:  'Sem origem',
}

function origemLabel(o: string) {
  return ORIGEM_LABELS[o] ?? o
}

export default function DashboardPage() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState(30)
  const [lembretesResumo, setLembretesResumo] = useState<Resumo | null>(null)
  const [pedidosResumo, setPedidosResumo] = useState<ResumoPedidos | null>(null)
  const [totalClientes, setTotalClientes] = useState<number | null>(null)
  const [totalProdutos, setTotalProdutos] = useState<number | null>(null)
  const [totalCiclos, setTotalCiclos] = useState<number | null>(null)
  const [origens, setOrigens] = useState<OrigemResumo[] | null>(null)
  const [jornada, setJornada] = useState<ResumoJornada | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [lembretes, pedidos, clientes, produtos, ciclos, origensData, jornadaData] = await Promise.all([
          api.get(`/lembretes/resumo?dias=${periodo}`),
          api.get(`/pedidos/resumo?dias=${periodo}`),
          api.get('/clientes'),
          api.get('/produtos'),
          api.get('/ciclos'),
          api.get(`/clientes/origens?dias=${periodo}`),
          api.get(`/pedidos/resumo-jornada?dias=${periodo}`),
        ])
        setLembretesResumo(lembretes.data)
        setPedidosResumo(pedidos.data)
        setTotalClientes(clientes.data.length)
        setTotalProdutos(produtos.data.length)
        setTotalCiclos(ciclos.data.length)
        setOrigens(origensData.data)
        setJornada(jornadaData.data)
      } catch {
        // silently fail — cards will show skeleton
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [periodo])

  const periodoParam = `${periodo}d`

  const cards = [
    {
      title: 'Clientes',
      value: totalClientes,
      icon: Users,
      desc: 'cadastrados',
    },
    {
      title: 'Produtos',
      value: totalProdutos,
      icon: Package,
      desc: 'no catálogo',
    },
    {
      title: 'Ciclos ativos',
      value: totalCiclos,
      icon: RefreshCw,
      desc: 'em andamento',
    },
    {
      title: `Lembretes (${periodoParam})`,
      value: lembretesResumo?.total,
      icon: Bell,
      desc: `${lembretesResumo?.enviados ?? '—'} enviados`,
    },
    {
      title: `Pedidos (${periodoParam})`,
      value: pedidosResumo?.total,
      icon: ShoppingBag,
      desc: `${pedidosResumo?.pendentes ?? '—'} pendentes`,
    },
  ]

  const totalOrigem = origens?.reduce((sum, o) => sum + o.total, 0) ?? 0

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral dos últimos {periodo} dias</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setPeriodo(p.dias)}
                className={cn(
                  'px-3 py-1 text-sm rounded transition-colors',
                  periodo === p.dias
                    ? 'bg-background shadow-sm font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map(({ title, value, icon: Icon, desc }) => (
            <Card key={title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{value ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vendas confirmadas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => router.push(`/pedidos?etapa=comprou&periodo=${periodoParam}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas confirmadas ({periodoParam})
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <p className="text-3xl font-bold">{jornada?.totalCompras ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span
                      className="hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/pedidos?periodo=${periodoParam}`)
                      }}
                    >
                      de {jornada?.totalPedidos ?? '—'} pedidos
                    </span>
                    {jornada && jornada.totalPedidos > 0 && (
                      <> · {Math.round((jornada.totalCompras / jornada.totalPedidos) * 100)}% conversão</>
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => router.push(`/pedidos?etapa=comprou&periodo=${periodoParam}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita confirmada ({periodoParam})
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <p className="text-3xl font-bold">
                    {jornada
                      ? `R$ ${Number(jornada.receitaConfirmada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </p>
                  {jornada && jornada.comprasSemValor > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {jornada.comprasSemValor} venda{jornada.comprasSemValor > 1 ? 's' : ''} sem valor informado
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Origem dos leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novos clientes por origem ({periodoParam})
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : !origens || origens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente novo no período</p>
            ) : (
              <div className="space-y-2">
                {origens.map((o) => {
                  const pct = totalOrigem > 0 ? Math.round((o.total / totalOrigem) * 100) : 0
                  return (
                    <div key={o.origem} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate">{origemLabel(o.origem)}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{o.total}</span>
                      <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  )
}
