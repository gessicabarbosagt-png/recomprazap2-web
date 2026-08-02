'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { flushSync } from 'react-dom'
import { useReactToPrint } from 'react-to-print'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { Users, Package, RefreshCw, Bell, ShoppingBag, Tag, TrendingUp, CircleDollarSign, FileDown, Loader2 } from 'lucide-react'
import {
  PeriodSelector,
  PeriodValue,
  periodValueToApiParams,
  periodValueToUrlParams,
  periodShortLabel,
} from '@/components/app/period-selector'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

interface VendaConfirmada {
  id: string
  clienteNome: string
  clienteTelefone: string
  produtoNome: string | null
  valor: number | null
  confirmadoEm: string | null
}

const ORIGEM_LABELS: Record<string, string> = {
  meta_ads:    'Meta Ads',
  importado:   'Importado',
  sem_origem:  'Sem origem',
}

function origemLabel(o: string) {
  return ORIGEM_LABELS[o] ?? o
}

function buildPeriodQuery(period: PeriodValue): string {
  const { dias, desde, ate } = periodValueToApiParams(period)
  const p = new URLSearchParams()
  if (dias != null) p.set('dias', String(dias))
  if (desde)        p.set('desde', desde)
  if (ate)          p.set('ate', ate)
  return p.toString()
}

function formatValor(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const DEFAULT_PERIOD: PeriodValue = { type: 'preset', dias: 30 }

// ── Componente de impressão ────────────────────────────────────────────────────

interface PrintProps {
  nomeLoja: string
  periodLabel: string
  geradoEm: string
  lembretesResumo: Resumo | null
  pedidosResumo: ResumoPedidos | null
  jornada: ResumoJornada | null
  origens: OrigemResumo[] | null
  vendas: VendaConfirmada[]
}

function DashboardPrint({
  nomeLoja, periodLabel, geradoEm,
  lembretesResumo, pedidosResumo, jornada, origens, vendas,
}: PrintProps) {
  const totalOrigem = origens?.reduce((s, o) => s + o.total, 0) ?? 0

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', padding: 32, maxWidth: 740, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Relatório RecompraZap</h1>
        <p style={{ margin: '4px 0 0', color: '#555' }}>{nomeLoja}</p>
        <p style={{ margin: '2px 0 0', color: '#555' }}>Período: {periodLabel} · Gerado em {geradoEm}</p>
      </div>

      {/* Resumo */}
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Resumo do período</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={tdLabel}>Lembretes enviados</td>
            <td style={tdValue}>{lembretesResumo?.enviados ?? '—'}</td>
            <td style={tdLabel}>Pedidos no período</td>
            <td style={tdValue}>{pedidosResumo?.total ?? '—'}</td>
          </tr>
          <tr>
            <td style={tdLabel}>Vendas confirmadas</td>
            <td style={tdValue}>{jornada?.totalCompras ?? '—'}</td>
            <td style={tdLabel}>Receita confirmada</td>
            <td style={tdValue}>{jornada ? formatValor(jornada.receitaConfirmada) : '—'}</td>
          </tr>
          <tr>
            <td style={tdLabel}>Conversão</td>
            <td style={tdValue}>
              {jornada && jornada.totalPedidos > 0
                ? `${Math.round((jornada.totalCompras / jornada.totalPedidos) * 100)}%`
                : '—'}
            </td>
            <td style={tdLabel}>Lembretes sem resposta</td>
            <td style={tdValue}>{lembretesResumo?.semResposta ?? '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* Origens */}
      {origens && origens.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Novos clientes por origem</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>Origem</th>
                <th style={{ ...th, textAlign: 'right' }}>Clientes</th>
                <th style={{ ...th, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {origens.map((o) => (
                <tr key={o.origem}>
                  <td style={td}>{origemLabel(o.origem)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{o.total}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#555' }}>
                    {totalOrigem > 0 ? `${Math.round((o.total / totalOrigem) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Vendas confirmadas */}
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        Vendas confirmadas ({vendas.length})
      </h2>
      {vendas.length === 0 ? (
        <p style={{ color: '#777' }}>Nenhuma venda confirmada no período.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>Cliente</th>
              <th style={th}>Produto</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
              <th style={{ ...th, textAlign: 'right' }}>Confirmado em</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id}>
                <td style={td}>{v.clienteNome}</td>
                <td style={{ ...td, color: '#555' }}>{v.produtoNome ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatValor(v.valor)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#555' }}>{formatData(v.confirmadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const tdLabel: React.CSSProperties = { padding: '4px 8px 4px 0', color: '#555', width: '25%' }
const tdValue: React.CSSProperties = { padding: '4px 16px 4px 0', fontWeight: 600, width: '25%' }
const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #d1d5db' }
const td: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }

// ── Página principal ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [lembretesResumo, setLembretesResumo] = useState<Resumo | null>(null)
  const [pedidosResumo, setPedidosResumo] = useState<ResumoPedidos | null>(null)
  const [totalClientes, setTotalClientes] = useState<number | null>(null)
  const [totalProdutos, setTotalProdutos] = useState<number | null>(null)
  const [totalCiclos, setTotalCiclos] = useState<number | null>(null)
  const [origens, setOrigens] = useState<OrigemResumo[] | null>(null)
  const [jornada, setJornada] = useState<ResumoJornada | null>(null)
  const [nomeLoja, setNomeLoja] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [vendasPDF, setVendasPDF] = useState<VendaConfirmada[]>([])

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `relatorio-recomprazap-${periodShortLabel(period).replace(/\s/g, '-')}`,
  })

  useEffect(() => {
    async function loadLoja() {
      try {
        const { data } = await api.get('/lojas/minha')
        setNomeLoja(data.nome ?? '')
      } catch { /* silent */ }
    }
    loadLoja()
  }, [])

  useEffect(() => {
    const pq = buildPeriodQuery(period)
    async function load() {
      setLoading(true)
      try {
        const [lembretes, pedidos, clientes, produtos, ciclos, origensData, jornadaData] = await Promise.all([
          api.get(`/lembretes/resumo${pq ? '?' + pq : ''}`),
          api.get(`/pedidos/resumo${pq ? '?' + pq : ''}`),
          api.get('/clientes'),
          api.get('/produtos'),
          api.get('/ciclos'),
          api.get(`/clientes/origens${pq ? '?' + pq : ''}`),
          api.get(`/pedidos/resumo-jornada${pq ? '?' + pq : ''}`),
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
  }, [period])

  // Monta URL do card preservando os params de período
  function cardLink(extra: Record<string, string> = {}) {
    const p = periodValueToUrlParams(period)
    Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    return `/pedidos?${p.toString()}`
  }

  async function handleExportPDF() {
    setLoadingPDF(true)
    try {
      const pq = buildPeriodQuery(period)
      const { data } = await api.get(`/pedidos?statusJornada=comprou${pq ? '&' + pq : ''}`)
      flushSync(() => {
        setVendasPDF(Array.isArray(data) ? data : [])
      })
      handlePrint()
    } catch {
      // silent
    } finally {
      setLoadingPDF(false)
    }
  }

  const periodLabel = periodShortLabel(period)
  const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  const cards = [
    { title: 'Clientes', value: totalClientes, icon: Users, desc: 'cadastrados' },
    { title: 'Produtos', value: totalProdutos, icon: Package, desc: 'no catálogo' },
    { title: 'Ciclos ativos', value: totalCiclos, icon: RefreshCw, desc: 'em andamento' },
    {
      title: `Lembretes (${periodLabel})`,
      value: lembretesResumo?.total,
      icon: Bell,
      desc: `${lembretesResumo?.enviados ?? '—'} enviados`,
    },
    {
      title: `Pedidos (${periodLabel})`,
      value: pedidosResumo?.total,
      icon: ShoppingBag,
      desc: `${pedidosResumo?.pendentes ?? '—'} pendentes`,
    },
  ]

  const totalOrigem = origens?.reduce((sum, o) => sum + o.total, 0) ?? 0

  return (
    <LayoutShell>
      {/* Componente de impressão — fora da tela visível */}
      {/* O ref deve ficar no div INTERNO sem o left:-9999px, pois react-to-print
          usa cloneNode(true) e copia os estilos inline — se o próprio div do ref
          tiver position:fixed/left:-9999px, o conteúdo fica fora da área de
          impressão e o PDF sai em branco. */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, overflow: 'hidden', width: 0, height: 0 }}
      >
        <div ref={printRef} style={{ width: 780 }}>
          <DashboardPrint
            nomeLoja={nomeLoja}
            periodLabel={periodLabel}
            geradoEm={geradoEm}
            lembretesResumo={lembretesResumo}
            pedidosResumo={pedidosResumo}
            jornada={jornada}
            origens={origens}
            vendas={vendasPDF}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral · {periodLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={loading || loadingPDF}
              className="h-8 gap-1.5 text-sm font-normal"
            >
              {loadingPDF
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />
              }
              Exportar PDF
            </Button>
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
            onClick={() => router.push(cardLink({ etapa: 'comprou' }))}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas confirmadas ({periodLabel})
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
                        router.push(cardLink())
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
            onClick={() => router.push(cardLink({ etapa: 'comprou' }))}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita confirmada ({periodLabel})
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
              Novos clientes por origem ({periodLabel})
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
