'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
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
import {
  PeriodSelector,
  PeriodValue,
  parsePeriodFromUrl,
  periodValueToUrlParams,
  periodValueToApiParams,
} from '@/components/app/period-selector'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  comprou:           'Comprou',
  nao_comprou:       'Não comprou',
  aguardando:        'Aguardando',
  orcamento_enviado: 'Orçamento enviado',
}

const ETAPAS_FINAIS = new Set(['comprou', 'nao_comprou'])

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

// ─── Conteúdo ─────────────────────────────────────────────────────────────────

function PedidosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const etapa = searchParams.get('etapa') ?? undefined
  const isFinalStage = etapa ? ETAPAS_FINAIS.has(etapa) : false

  // Lê período da URL; etapas não-finais (pendentes) default para "todos"
  const initialPeriod = searchParams.get('periodo')
    ? parsePeriodFromUrl(searchParams.get('periodo'), searchParams.get('de'))
    : isFinalStage
    ? { type: 'preset' as const, dias: 30 }
    : { type: 'todos' as const }

  const [period, setPeriod] = useState<PeriodValue>(initialPeriod)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  // Sincroniza estado de período → URL (sem reload)
  const updateUrl = useCallback((v: PeriodValue) => {
    const p = periodValueToUrlParams(v)
    if (etapa) p.set('etapa', etapa)
    // Garante que etapa vem antes do periodo na URL
    const ordered = new URLSearchParams()
    if (etapa) ordered.set('etapa', etapa)
    periodValueToUrlParams(v).forEach((val, key) => ordered.set(key, val))
    router.replace(`/pedidos?${ordered.toString()}`, { scroll: false })
  }, [etapa, router])

  function handlePeriodChange(v: PeriodValue) {
    setPeriod(v)
    updateUrl(v)
  }

  // Carrega pedidos ao mudar etapa ou período
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const apiParams = new URLSearchParams()
        if (etapa) apiParams.set('statusJornada', etapa)

        const { dias, desde } = periodValueToApiParams(period)
        if (dias != null) apiParams.set('dias', String(dias))
        if (desde)       apiParams.set('desde', desde)

        const { data } = await api.get(`/pedidos?${apiParams.toString()}`)
        setPedidos(Array.isArray(data) ? data : [])
      } catch {
        setPedidos([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [etapa, period])

  // ── Labels dinâmicos ────────────────────────────────────────────────────────

  const etapaLabel = etapa ? (ETAPA_LABELS[etapa] ?? etapa) : null

  const periodoLabel = period.type === 'preset'
    ? `${period.dias}d`
    : period.type === 'custom'
    ? `desde ${period.de}`
    : 'todos'

  const titulo = etapaLabel
    ? `${etapaLabel} · ${periodoLabel}`
    : `Pedidos · ${periodoLabel}`

  const colunaData = etapa === 'comprou' ? 'Confirmado em' : 'Data'

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <LayoutShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-muted-foreground mt-0.5 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '…' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Seletor de período */}
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          showTodos={!isFinalStage}
        />

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>{colunaData}</TableHead>
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
                    Nenhum pedido encontrado
                    {period.type !== 'todos' && ' no período'}
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((p) => {
                  const dataDisplay = etapa === 'comprou'
                    ? formatData(p.confirmadoEm)
                    : formatData(p.createdAt)

                  return (
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
                        {dataDisplay}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Abrir conversa no inbox"
                          onClick={() => router.push(
                            `/mensagens?telefone=${encodeURIComponent(p.clienteTelefone)}`
                          )}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </LayoutShell>
  )
}

// ─── Export com Suspense ──────────────────────────────────────────────────────

export default function PedidosPage() {
  return (
    <Suspense fallback={<LayoutShell><Skeleton className="h-96 w-full" /></LayoutShell>}>
      <PedidosContent />
    </Suspense>
  )
}
