'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { MessageSquare, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Pedido {
  id: string
  clienteId: string
  clienteNome: string
  clienteTelefone: string
  produtoNome: string | null
  valor: number | null
  confirmadoEm: string | null
  statusJornada: string
  createdAt: string
}

const ETAPA_LABELS: Record<string, string> = {
  comprou: 'Comprou',
  nao_comprou: 'Não comprou',
  aguardando: 'Aguardando',
  orcamento_enviado: 'Orçamento enviado',
}

function formatValor(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function PedidosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const etapa = searchParams.get('etapa') ?? undefined
  const periodoParam = searchParams.get('periodo') ?? '30d'
  const dias = parseInt(periodoParam.replace('d', ''), 10) || 30

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (etapa) params.set('statusJornada', etapa)
        params.set('dias', String(dias))
        const { data } = await api.get(`/pedidos?${params.toString()}`)
        setPedidos(Array.isArray(data) ? data : [])
      } catch {
        setPedidos([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [etapa, dias])

  const titulo = etapa
    ? `Vendas — ${ETAPA_LABELS[etapa] ?? etapa} (${periodoParam})`
    : `Pedidos (${periodoParam})`

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '…' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Confirmado em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Nenhum pedido encontrado no período
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{p.clienteTelefone}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.produtoNome ?? '—'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-medium',
                        p.valor != null ? 'text-emerald-700' : 'text-muted-foreground',
                      )}
                    >
                      {formatValor(p.valor)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatData(p.confirmadoEm ?? p.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Abrir conversa no inbox"
                        onClick={() => router.push(`/mensagens?telefone=${encodeURIComponent(p.clienteTelefone)}`)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </LayoutShell>
  )
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<LayoutShell><Skeleton className="h-96 w-full" /></LayoutShell>}>
      <PedidosContent />
    </Suspense>
  )
}
