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
import { Input } from '@/components/ui/input'
import { MessageSquare, ArrowLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PeriodSelector,
  PeriodValue,
  parsePeriodFromUrl,
  periodValueToUrlParams,
  periodValueToApiParams,
  periodShortLabel,
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

interface EtapaInfo {
  id: string
  nome: string
  tipo: string
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

function etapaBadgeClass(tipo: string) {
  if (tipo === 'final_comprou')     return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (tipo === 'final_nao_comprou') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
  return 'bg-muted text-muted-foreground'
}

// ─── Conteúdo ─────────────────────────────────────────────────────────────────

function PedidosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const etapaParam = searchParams.get('etapa') ?? undefined

  // Info da etapa filtrada (busca pelo UUID)
  const [etapaInfo, setEtapaInfo] = useState<EtapaInfo | null>(null)
  useEffect(() => {
    if (!etapaParam) { setEtapaInfo(null); return }
    api.get('/etapas-jornada').then(({ data }) => {
      const found = Array.isArray(data) ? data.find((e: EtapaInfo) => e.id === etapaParam) : null
      setEtapaInfo(found ?? null)
    }).catch(() => setEtapaInfo(null))
  }, [etapaParam])

  // Etapa final = visão de compras (usa confirmado_em, sem "Todos" no period selector)
  // Sem filtro de etapa = padrão = só vendas reais (também final)
  const isFinalStage = !etapaParam || (
    etapaInfo !== null &&
    (etapaInfo.tipo === 'final_comprou' || etapaInfo.tipo === 'final_nao_comprou')
  )

  const initialPeriod: PeriodValue = searchParams.get('periodo')
    ? parsePeriodFromUrl(searchParams.get('periodo'), searchParams.get('de'), searchParams.get('ate'))
    : { type: 'preset', dias: 30 }

  const [period, setPeriod] = useState<PeriodValue>(initialPeriod)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoValorId, setEditandoValorId] = useState<string | null>(null)
  const [editandoValorInput, setEditandoValorInput] = useState('')
  const [salvandoValorId, setSalvandoValorId] = useState<string | null>(null)

  const updateUrl = useCallback((v: PeriodValue) => {
    const ordered = new URLSearchParams()
    if (etapaParam) ordered.set('etapa', etapaParam)
    periodValueToUrlParams(v).forEach((val, key) => ordered.set(key, val))
    router.replace(`/pedidos?${ordered.toString()}`, { scroll: false })
  }, [etapaParam, router])

  function handlePeriodChange(v: PeriodValue) {
    setPeriod(v)
    updateUrl(v)
  }

  function clearEtapaFilter() {
    const p = periodValueToUrlParams(period)
    router.push(`/pedidos?${p.toString()}`)
  }

  async function salvarValorPedido(id: string) {
    const v = parseFloat(editandoValorInput.replace(',', '.'))
    if (isNaN(v) || v < 0) { toast.error('Valor inválido'); return }
    setSalvandoValorId(id)
    try {
      await api.patch(`/pedidos/${id}/valor`, { valor: v })
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, valor: v } : p))
      setEditandoValorId(null)
      setEditandoValorInput('')
      toast.success('Valor registrado!')
    } catch {
      toast.error('Erro ao salvar valor')
    } finally {
      setSalvandoValorId(null)
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const apiParams = new URLSearchParams()
        if (etapaParam) {
          // Filtro por etapa UUID — backend ignora o padrão final_comprou
          apiParams.set('etapaId', etapaParam)
        }
        // Sem etapaParam: API retorna apenas final_comprou por padrão

        const { dias, desde, ate } = periodValueToApiParams(period)
        if (dias != null) apiParams.set('dias', String(dias))
        if (desde)        apiParams.set('desde', desde)
        if (ate)          apiParams.set('ate', ate)

        const { data } = await api.get(`/pedidos?${apiParams.toString()}`)
        setPedidos(Array.isArray(data) ? data : [])
      } catch {
        setPedidos([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [etapaParam, period])

  // ── Labels ──────────────────────────────────────────────────────────────────

  const periodoLabel = periodShortLabel(period)

  const tituloBase = etapaParam ? 'Pedidos' : 'Vendas confirmadas'

  // Coluna de data: confirmado_em para comprou ou visão padrão
  const usarConfirmadoEm = !etapaParam || etapaInfo?.tipo === 'final_comprou'
  const colunaData = usarConfirmadoEm ? 'Confirmado em' : 'Data'

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{tituloBase} · {periodoLabel}</h1>
              {etapaParam && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  etapaInfo ? etapaBadgeClass(etapaInfo.tipo) : 'bg-muted text-muted-foreground',
                )}>
                  {etapaInfo ? etapaInfo.nome : '…'}
                  <button
                    type="button"
                    onClick={clearEtapaFilter}
                    className="ml-0.5 hover:opacity-70"
                    title="Limpar filtro e ver apenas vendas"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '…' : `${pedidos.length} cliente${pedidos.length !== 1 ? 's' : ''}`}
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
                  const dataDisplay = usarConfirmadoEm
                    ? formatData(p.confirmadoEm)
                    : formatData(p.createdAt)

                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => router.push(
                        `/mensagens?telefone=${encodeURIComponent(p.clienteTelefone)}`
                      )}
                    >
                      <TableCell>
                        <p className="font-medium">{p.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">{p.clienteTelefone}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.produtoNome ?? '—'}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        onClick={e => e.stopPropagation()}
                      >
                        {p.valor != null ? (
                          <span className="text-emerald-700">{formatValor(p.valor)}</span>
                        ) : editandoValorId === p.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              autoFocus
                              type="text"
                              inputMode="decimal"
                              value={editandoValorInput}
                              onChange={e => setEditandoValorInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') salvarValorPedido(p.id)
                                if (e.key === 'Escape') setEditandoValorId(null)
                              }}
                              className="h-7 w-24 text-xs px-1.5"
                              placeholder="0,00"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => salvarValorPedido(p.id)}
                              disabled={salvandoValorId === p.id}
                            >
                              OK
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setEditandoValorId(p.id); setEditandoValorInput('') }}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                          >
                            Informar valor
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dataDisplay}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
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
