'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { flushSync } from 'react-dom'
import dynamic from 'next/dynamic'
import { useReactToPrint } from 'react-to-print'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  Users, Package, RefreshCw, Bell, ShoppingBag,
  TrendingUp, TrendingDown, CircleDollarSign, FileDown, Loader2,
  Activity, UserPlus, CheckCircle2, Layers, Clock,
  ArrowUpRight, Minus,
} from 'lucide-react'
import {
  PeriodSelector, PeriodValue, periodValueToApiParams,
  periodValueToUrlParams, periodShortLabel,
} from '@/components/app/period-selector'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// Recharts via dynamic import para evitar SSR mismatch
const AreaChart      = dynamic(() => import('recharts').then(m => m.AreaChart),      { ssr: false })
const Area           = dynamic(() => import('recharts').then(m => m.Area),           { ssr: false })
const XAxis          = dynamic(() => import('recharts').then(m => m.XAxis),          { ssr: false })
const YAxis          = dynamic(() => import('recharts').then(m => m.YAxis),          { ssr: false })
const CartesianGrid  = dynamic(() => import('recharts').then(m => m.CartesianGrid),  { ssr: false })
const Tooltip        = dynamic(() => import('recharts').then(m => m.Tooltip),        { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const PieChart       = dynamic(() => import('recharts').then(m => m.PieChart),       { ssr: false })
const Pie            = dynamic(() => import('recharts').then(m => m.Pie),            { ssr: false })
const Cell           = dynamic(() => import('recharts').then(m => m.Cell),           { ssr: false })

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Resumo {
  total: number; enviados: number; semResposta: number; cancelados: number
}
interface ResumoPedidos {
  total: number; pendentes: number; confirmados: number; entregues: number; cancelados: number
}
interface OrigemResumo { origem: string; total: number }
interface ResumoJornada {
  totalPedidos: number; totalCompras: number; comprasSemValor: number; receitaConfirmada: number
}
interface VendaConfirmada {
  id: string; clienteNome: string; clienteTelefone: string
  produtoNome: string | null; valor: number | null; confirmadoEm: string | null
}
interface PontoSerie { dia: string; vendas: number; receita: number }
interface SerieTemporal {
  agrupamento: 'dia' | 'semana'
  pontos: PontoSerie[]
  totalVendas: number; totalReceita: number
  variacaoVendas: number; variacaoReceita: number
}
interface AtividadeLog { id: string; tipo: string; descricao: string; criadoEm: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORIGEM_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads', importado: 'Importado', sem_origem: 'Sem origem',
}
function origemLabel(o: string) { return ORIGEM_LABELS[o] ?? o }

function fmtValor(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDataCurta(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function buildPeriodQuery(period: PeriodValue): string {
  const { dias, desde, ate } = periodValueToApiParams(period)
  const p = new URLSearchParams()
  if (dias != null) p.set('dias', String(dias))
  if (desde) p.set('desde', desde)
  if (ate) p.set('ate', ate)
  return p.toString()
}

// ── Componente de impressão ───────────────────────────────────────────────────

interface PrintProps {
  nomeLoja: string; periodLabel: string; geradoEm: string
  lembretesResumo: Resumo | null; pedidosResumo: ResumoPedidos | null
  jornada: ResumoJornada | null; origens: OrigemResumo[] | null; vendas: VendaConfirmada[]
}
function DashboardPrint({ nomeLoja, periodLabel, geradoEm, lembretesResumo, pedidosResumo, jornada, origens, vendas }: PrintProps) {
  const totalOrigem = origens?.reduce((s, o) => s + o.total, 0) ?? 0
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', padding: 32, maxWidth: 740, margin: '0 auto' }}>
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Relatório RecompraZap</h1>
        <p style={{ margin: '4px 0 0', color: '#555' }}>{nomeLoja}</p>
        <p style={{ margin: '2px 0 0', color: '#555' }}>Período: {periodLabel} · Gerado em {geradoEm}</p>
      </div>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Resumo do período</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={tdL}>Lembretes enviados</td><td style={tdV}>{lembretesResumo?.enviados ?? '—'}</td>
            <td style={tdL}>Pedidos no período</td><td style={tdV}>{pedidosResumo?.total ?? '—'}</td>
          </tr>
          <tr>
            <td style={tdL}>Vendas confirmadas</td><td style={tdV}>{jornada?.totalCompras ?? '—'}</td>
            <td style={tdL}>Receita confirmada</td><td style={tdV}>{jornada ? fmtValor(jornada.receitaConfirmada) : '—'}</td>
          </tr>
          <tr>
            <td style={tdL}>Conversão</td>
            <td style={tdV}>{jornada && jornada.totalPedidos > 0 ? `${Math.round((jornada.totalCompras / jornada.totalPedidos) * 100)}%` : '—'}</td>
            <td style={tdL}>Lembretes sem resposta</td><td style={tdV}>{lembretesResumo?.semResposta ?? '—'}</td>
          </tr>
        </tbody>
      </table>
      {origens && origens.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Novos clientes por origem</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={thS}>Origem</th><th style={{ ...thS, textAlign: 'right' }}>Clientes</th><th style={{ ...thS, textAlign: 'right' }}>%</th></tr></thead>
            <tbody>{origens.map(o => (<tr key={o.origem}><td style={tdS}>{origemLabel(o.origem)}</td><td style={{ ...tdS, textAlign: 'right' }}>{o.total}</td><td style={{ ...tdS, textAlign: 'right', color: '#555' }}>{totalOrigem > 0 ? `${Math.round((o.total / totalOrigem) * 100)}%` : '—'}</td></tr>))}</tbody>
          </table>
        </>
      )}
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Vendas confirmadas ({vendas.length})</h2>
      {vendas.length === 0 ? <p style={{ color: '#777' }}>Nenhuma venda confirmada no período.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f3f4f6' }}><th style={thS}>Cliente</th><th style={thS}>Produto</th><th style={{ ...thS, textAlign: 'right' }}>Valor</th><th style={{ ...thS, textAlign: 'right' }}>Confirmado em</th></tr></thead>
          <tbody>{vendas.map(v => (<tr key={v.id}><td style={tdS}>{v.clienteNome}</td><td style={{ ...tdS, color: '#555' }}>{v.produtoNome ?? '—'}</td><td style={{ ...tdS, textAlign: 'right' }}>{fmtValor(v.valor)}</td><td style={{ ...tdS, textAlign: 'right', color: '#555' }}>{fmtDataCurta(v.confirmadoEm)}</td></tr>))}</tbody>
        </table>
      )}
    </div>
  )
}
const tdL: React.CSSProperties = { padding: '4px 8px 4px 0', color: '#555', width: '25%' }
const tdV: React.CSSProperties = { padding: '4px 16px 4px 0', fontWeight: 600, width: '25%' }
const thS: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #d1d5db' }
const tdS: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #e5e7eb' }

// ── Sub-componentes do redesign ────────────────────────────────────────────────

function VariacaoBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return null
  const positivo = v >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      positivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    )}>
      {v === 0 ? <Minus className="h-3 w-3" /> : positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {v === 0 ? 'Estável' : `${positivo ? '+' : ''}${v}%`}
    </span>
  )
}

// Cores para os cards de topo
const CARD_COLORS = [
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-violet-50 dark:bg-violet-950/40',   icon: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-blue-50 dark:bg-blue-950/40',        icon: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40',    icon: 'text-orange-500 dark:text-orange-400' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40',        icon: 'text-pink-600 dark:text-pink-400' },
]

// Ícones e labels por tipo de atividade
const ATIVIDADE_META: Record<string, { icon: React.ElementType; cor: string }> = {
  cliente_criado:    { icon: UserPlus,     cor: 'text-emerald-500' },
  pedido_confirmado: { icon: CheckCircle2, cor: 'text-blue-500' },
  ciclo_criado:      { icon: RefreshCw,    cor: 'text-violet-500' },
  lembrete_criado:   { icon: Bell,         cor: 'text-orange-500' },
}

// Formata label do eixo X dos gráficos
function fmtEixoX(dia: string, agrupamento: 'dia' | 'semana') {
  try {
    const d = parseISO(dia)
    return agrupamento === 'semana'
      ? format(d, "d 'MMM'", { locale: ptBR })
      : format(d, 'dd/MM', { locale: ptBR })
  } catch { return dia }
}

// Tooltip customizado para os gráficos de área
function TooltipArea({ active, payload, label, tipo }: any) {
  if (!active || !payload?.length) return null
  const valor = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold">
        {tipo === 'receita' ? fmtValor(valor) : `${valor} venda${valor !== 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

const DEFAULT_PERIOD: PeriodValue = { type: 'preset', dias: 30 }

const CORES_DONUT_ORIGINS = ['#2E9E75', '#1F4E79', '#6366f1', '#f59e0b', '#ec4899', '#64748b']

export default function DashboardPage() {
  const { usuario } = useAuth()
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)

  // Dados
  const [lembretesResumo, setLembretesResumo] = useState<Resumo | null>(null)
  const [pedidosResumo, setPedidosResumo]     = useState<ResumoPedidos | null>(null)
  const [totalClientes, setTotalClientes]     = useState<number | null>(null)
  const [totalProdutos, setTotalProdutos]     = useState<number | null>(null)
  const [totalCiclos, setTotalCiclos]         = useState<number | null>(null)
  const [origens, setOrigens]                 = useState<OrigemResumo[] | null>(null)
  const [jornada, setJornada]                 = useState<ResumoJornada | null>(null)
  const [serie, setSerie]                     = useState<SerieTemporal | null>(null)
  const [atividades, setAtividades]           = useState<AtividadeLog[] | null>(null)
  const [nomeLoja, setNomeLoja]               = useState('')
  const [loading, setLoading]                 = useState(true)
  const [loadingPDF, setLoadingPDF]           = useState(false)
  const [vendasPDF, setVendasPDF]             = useState<VendaConfirmada[]>([])

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `relatorio-recomprazap-${periodShortLabel(period).replace(/\s/g, '-')}`,
  })

  useEffect(() => {
    api.get('/lojas/minha').then(r => setNomeLoja(r.data.nome ?? '')).catch(() => {})
    api.get('/atividade-log?limite=6').then(r => setAtividades(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const pq = buildPeriodQuery(period)
    async function load() {
      setLoading(true)
      try {
        const [lembretes, pedidos, clientes, produtos, ciclos, origensData, jornadaData, serieData] =
          await Promise.all([
            api.get(`/lembretes/resumo${pq ? '?' + pq : ''}`),
            api.get(`/pedidos/resumo${pq ? '?' + pq : ''}`),
            api.get('/clientes'),
            api.get('/produtos'),
            api.get('/ciclos'),
            api.get(`/clientes/origens${pq ? '?' + pq : ''}`),
            api.get(`/pedidos/resumo-jornada${pq ? '?' + pq : ''}`),
            api.get(`/dashboard/serie-temporal${pq ? '?' + pq : ''}`),
          ])
        setLembretesResumo(lembretes.data)
        setPedidosResumo(pedidos.data)
        setTotalClientes(clientes.data.length)
        setTotalProdutos(produtos.data.length)
        setTotalCiclos(ciclos.data.length)
        setOrigens(origensData.data)
        setJornada(jornadaData.data)
        setSerie(serieData.data)
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [period])

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
      flushSync(() => setVendasPDF(Array.isArray(data) ? data : []))
      handlePrint()
    } catch { /* silent */ } finally { setLoadingPDF(false) }
  }

  const periodLabel = periodShortLabel(period)
  const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  const primeiroNome = usuario?.nome?.split(' ')[0] ?? ''

  const cards = [
    { title: 'Clientes',      value: totalClientes, icon: Users,       desc: 'cadastrados' },
    { title: 'Produtos',      value: totalProdutos, icon: Package,     desc: 'no catálogo' },
    { title: 'Ciclos ativos', value: totalCiclos,   icon: RefreshCw,   desc: 'em andamento' },
    {
      title: `Lembretes`,
      value: lembretesResumo?.total,
      icon: Bell,
      desc: `${lembretesResumo?.enviados ?? '—'} enviados`,
    },
    {
      title: `Pedidos`,
      value: pedidosResumo?.total,
      icon: ShoppingBag,
      desc: `${pedidosResumo?.pendentes ?? '—'} pendentes`,
    },
  ]

  const totalOrigem = origens?.reduce((s, o) => s + o.total, 0) ?? 0

  // Dados donut conversão
  const totalPedidos  = jornada?.totalPedidos ?? 0
  const totalCompras  = jornada?.totalCompras ?? 0
  const naoConvertido = Math.max(0, totalPedidos - totalCompras)
  const donutConversao = totalPedidos > 0
    ? [
        { name: 'Convertidos',    value: totalCompras },
        { name: 'Não convertidos', value: naoConvertido },
      ]
    : [{ name: 'Sem dados', value: 1 }]
  const pctConversao = totalPedidos > 0 ? Math.round((totalCompras / totalPedidos) * 100) : 0

  // Dados donut origens
  const donutOrigens = origens?.map((o, i) => ({
    name: origemLabel(o.origem), value: o.total, cor: CORES_DONUT_ORIGINS[i % CORES_DONUT_ORIGINS.length],
  })) ?? []

  return (
    <LayoutShell>
      {/* Componente de impressão */}
      <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: 0, overflow: 'hidden', width: 0, height: 0 }}>
        <div ref={printRef} style={{ width: 780 }}>
          <DashboardPrint
            nomeLoja={nomeLoja} periodLabel={periodLabel} geradoEm={geradoEm}
            lembretesResumo={lembretesResumo} pedidosResumo={pedidosResumo}
            jornada={jornada} origens={origens} vendas={vendasPDF}
          />
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {primeiroNome}! 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Aqui está o resumo da sua operação nos últimos{' '}
              <span className="font-medium text-foreground">{periodLabel}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button
              variant="outline" size="sm"
              onClick={handleExportPDF}
              disabled={loading || loadingPDF}
              className="h-8 gap-1.5 text-sm font-normal"
            >
              {loadingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* ── Cards do topo (5 métricas) ────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map(({ title, value, icon: Icon, desc }, i) => {
            const { bg, icon: iconCn } = CARD_COLORS[i]
            return (
              <Card key={title} className="relative overflow-hidden">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', bg)}>
                      <Icon className={cn('h-5 w-5', iconCn)} />
                    </div>
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold tracking-tight">{value ?? '—'}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{title} · {desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Linha 2: Gráficos de área — Vendas e Receita ──────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Gráfico vendas */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vendas confirmadas</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{serie?.totalVendas ?? 0}</span>
                      <VariacaoBadge v={serie?.variacaoVendas} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">vs período anterior</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : serie && serie.pontos.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie.pontos} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2E9E75" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2E9E75" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={d => fmtEixoX(d, serie.agrupamento)} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<TooltipArea tipo="vendas" />} />
                      <Area type="monotone" dataKey="vendas" stroke="#2E9E75" strokeWidth={2} fill="url(#gradVendas)" dot={false} activeDot={{ r: 4, fill: '#2E9E75' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Sem vendas no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico receita */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Receita confirmada</p>
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{fmtValor(serie?.totalReceita)}</span>
                      <VariacaoBadge v={serie?.variacaoReceita} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">vs período anterior</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <CircleDollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : serie && serie.pontos.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie.pontos} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1F4E79" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1F4E79" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={d => fmtEixoX(d, serie.agrupamento)} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<TooltipArea tipo="receita" />} />
                      <Area type="monotone" dataKey="receita" stroke="#1F4E79" strokeWidth={2} fill="url(#gradReceita)" dot={false} activeDot={{ r: 4, fill: '#1F4E79' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Sem receita no período
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Linha 3: Donut Conversão + Donut Origens ──────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Donut conversão */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Conversão de pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-6">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutConversao}
                          cx="50%" cy="50%"
                          innerRadius={38} outerRadius={56}
                          startAngle={90} endAngle={-270}
                          dataKey="value" strokeWidth={0}
                        >
                          {totalPedidos > 0 ? (
                            donutConversao.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? '#2E9E75' : 'var(--muted)'} />
                            ))
                          ) : (
                            <Cell fill="var(--muted)" />
                          )}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold">{pctConversao}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{totalCompras}</span> de{' '}
                      <span className="font-semibold text-foreground">{totalPedidos}</span> pedidos convertidos
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#2E9E75]" />
                      Vendas confirmadas ({totalCompras})
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                      Não convertidos ({naoConvertido})
                    </div>
                    {jornada && jornada.comprasSemValor > 0 && (
                      <Link href="/pedidos?etapa=comprou" className="text-xs text-amber-600 hover:underline block">
                        {jornada.comprasSemValor} venda{jornada.comprasSemValor > 1 ? 's' : ''} sem valor →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donut origens */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Novos clientes por origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-6">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ) : !origens || origens.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cliente novo no período</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutOrigens}
                          cx="50%" cy="50%"
                          innerRadius={38} outerRadius={56}
                          startAngle={90} endAngle={-270}
                          dataKey="value" strokeWidth={0}
                        >
                          {donutOrigens.map((d, i) => <Cell key={i} fill={d.cor} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold">{totalOrigem}</span>
                      <span className="text-[10px] text-muted-foreground">clientes</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {donutOrigens.map(o => {
                      const pct = totalOrigem > 0 ? Math.round((o.value / totalOrigem) * 100) : 0
                      return (
                        <div key={o.name} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: o.cor }} />
                          <span className="flex-1 text-muted-foreground truncate">{o.name}</span>
                          <span className="font-semibold text-foreground">{o.value}</span>
                          <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Linha 4: Atividade recente ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Atividade recente
              </CardTitle>
              {/* Link inativo por enquanto — escopo menor conforme spec */}
              <span className="text-xs text-muted-foreground/50 select-none">Ver todas</span>
            </div>
          </CardHeader>
          <CardContent>
            {atividades === null ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : atividades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma atividade registrada ainda. Crie um cliente ou confirme uma venda para começar.
              </p>
            ) : (
              <div className="divide-y">
                {atividades.map(a => {
                  const meta = ATIVIDADE_META[a.tipo] ?? { icon: Clock, cor: 'text-muted-foreground' }
                  const Icon = meta.icon
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className={cn('h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0')}>
                        <Icon className={cn('h-4 w-4', meta.cor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{a.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(a.criadoEm), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
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
