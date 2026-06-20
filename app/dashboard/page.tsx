'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { Users, Package, RefreshCw, Bell, ShoppingBag } from 'lucide-react'

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

export default function DashboardPage() {
  const [lembretesResumo, setLembretesResumo] = useState<Resumo | null>(null)
  const [pedidosResumo, setPedidosResumo] = useState<ResumoPedidos | null>(null)
  const [totalClientes, setTotalClientes] = useState<number | null>(null)
  const [totalProdutos, setTotalProdutos] = useState<number | null>(null)
  const [totalCiclos, setTotalCiclos] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [lembretes, pedidos, clientes, produtos, ciclos] = await Promise.all([
          api.get('/lembretes/resumo?dias=30'),
          api.get('/pedidos/resumo?dias=30'),
          api.get('/clientes'),
          api.get('/produtos'),
          api.get('/ciclos'),
        ])
        setLembretesResumo(lembretes.data)
        setPedidosResumo(pedidos.data)
        setTotalClientes(clientes.data.length)
        setTotalProdutos(produtos.data.length)
        setTotalCiclos(ciclos.data.length)
      } catch {
        // silently fail — cards will show skeleton
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
      title: 'Lembretes (30d)',
      value: lembretesResumo?.total,
      icon: Bell,
      desc: `${lembretesResumo?.enviados ?? '—'} enviados`,
    },
    {
      title: 'Pedidos (30d)',
      value: pedidosResumo?.total,
      icon: ShoppingBag,
      desc: `${pedidosResumo?.pendentes ?? '—'} pendentes`,
    },
  ]

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral dos últimos 30 dias</p>
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
      </div>
    </LayoutShell>
  )
}
