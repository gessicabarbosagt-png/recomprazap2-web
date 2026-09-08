'use client'

import { useEffect, useState, useCallback } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  CreditCard, QrCode, CheckCircle, XCircle, Clock, Loader2,
  AlertTriangle, ShieldCheck, MessageCircle, CalendarDays, ExternalLink,
  Users, TrendingUp, TrendingDown, DollarSign, Crown, ArrowRight, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PlanoCatalogo {
  id: string
  slug: string
  nome: string
  precoMensal: number
  limiteClientes: number
  selfServe: boolean
  features: Record<string, any>
}

interface PlanoLoja {
  planoSlug: string | null
  planoNome: string
  limiteClientes: number | null
  totalClientes: number
  valorMensalidade: number | null
  planoPendente: {
    slug: string
    nome: string
    precoMensal: number
    efetivaDm: string
  } | null
}

interface StatusPlano {
  statusAssinatura: 'ativa' | 'inadimplente' | 'cancelada'
  valorMensalidade: string | null
  proximoVencimento: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  inadimplenteDesdE: string | null
  ativa: boolean
}

interface Pagamento {
  id: string
  tipo: 'card' | 'pix'
  valor: string
  status: 'pendente' | 'aprovado' | 'recusado' | 'cancelado'
  descricao: string | null
  mpPaymentId: string | null
  criadoEm: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtValor(v: string | null | number) {
  if (!v) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function fmtData(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) }
  catch { return d }
}

function fmtDataCurta(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return d }
}

const PAGTO_STATUS: Record<string, { label: string; badgeCn: string; icon: React.ReactNode }> = {
  aprovado: {
    label: 'Pago',
    badgeCn: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  pendente: {
    label: 'Pendente',
    badgeCn: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  recusado: {
    label: 'Falhou',
    badgeCn: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  cancelado: {
    label: 'Cancelado',
    badgeCn: 'bg-muted text-muted-foreground border-border',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

// ── Página principal ──────────────────────────────────────────────────────────

const PAGAMENTOS_VISIVEIS = 5

export default function PlanoPage() {
  const [statusPlano, setStatusPlano]       = useState<StatusPlano | null>(null)
  const [pagamentos, setPagamentos]         = useState<Pagamento[]>([])
  const [carregando, setCarregando]         = useState(true)
  const [processando, setProcessando]       = useState(false)
  const [planosAberto, setPlanosAberto]     = useState(false)
  const [suporteAberto, setSuporteAberto]   = useState(false)
  const [catalogo, setCatalogo]             = useState<PlanoCatalogo[]>([])
  const [planoLoja, setPlanoLoja]           = useState<PlanoLoja | null>(null)
  const [aplicandoPlano, setAplicandoPlano] = useState(false)
  const [verTodosPagamentos, setVerTodosPagamentos] = useState(false)

  const carregarDados = useCallback(async () => {
    try {
      const [planoRes, pagRes, catalogoRes, planoLojaRes] = await Promise.all([
        api.get('/pagamentos/plano'),
        api.get('/pagamentos'),
        api.get('/planos/catalogo').catch(() => ({ data: [] })),
        api.get('/lojas/minha/plano').catch(() => ({ data: null })),
      ])
      setStatusPlano(planoRes.data)
      setPagamentos(pagRes.data)
      setCatalogo(catalogoRes.data)
      setPlanoLoja(planoLojaRes.data)
    } catch {
      toast.error('Erro ao carregar dados do plano')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Exibe toast quando Stripe redireciona de volta com ?sucesso=true ou ?cancelado=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sucesso') === 'true') {
      toast.success('Assinatura criada com sucesso! Obrigado.')
      window.history.replaceState({}, '', '/plano')
    } else if (params.get('cancelado') === 'true') {
      toast.info('Pagamento cancelado. Volte quando quiser para assinar.')
      window.history.replaceState({}, '', '/plano')
    }
  }, [])

  async function handleUpgrade(planoSlug: string) {
    setAplicandoPlano(true)
    try {
      await api.post('/lojas/minha/plano/upgrade', { planoSlug })
      toast.success('Plano atualizado! O novo valor será cobrado no próximo ciclo.')
      setPlanosAberto(false)
      await carregarDados()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao aplicar upgrade')
    } finally {
      setAplicandoPlano(false)
    }
  }

  async function handleDowngrade(planoSlug: string) {
    setAplicandoPlano(true)
    try {
      const { data } = await api.post('/lojas/minha/plano/downgrade', { planoSlug })
      toast.success(`Downgrade agendado para ${fmtData(data.efetivaDm)}. O plano mudará automaticamente nessa data.`)
      setPlanosAberto(false)
      await carregarDados()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao agendar downgrade')
    } finally {
      setAplicandoPlano(false)
    }
  }

  async function handleCancelarDowngradePendente() {
    try {
      await api.delete('/lojas/minha/plano/downgrade-pendente')
      toast.success('Downgrade agendado cancelado.')
      await carregarDados()
    } catch {
      toast.error('Erro ao cancelar downgrade')
    }
  }

  async function handleAssinar() {
    setProcessando(true)
    try {
      const { data } = await api.post('/pagamentos/stripe/checkout')
      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('Não foi possível iniciar o checkout. Tente novamente.')
        setProcessando(false)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao iniciar checkout Stripe')
      setProcessando(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <LayoutShell>
        <div className="max-w-5xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Skeleton className="lg:col-span-3 h-52 rounded-2xl" />
            <Skeleton className="lg:col-span-2 h-52 rounded-2xl" />
          </div>
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </LayoutShell>
    )
  }

  const plano = statusPlano!
  const valorMensalidade = plano.valorMensalidade ? Number(plano.valorMensalidade) : 0

  const pct = planoLoja?.limiteClientes
    ? Math.min(100, (planoLoja.totalClientes / planoLoja.limiteClientes) * 100)
    : 0
  const restantes = planoLoja?.limiteClientes != null
    ? planoLoja.limiteClientes - planoLoja.totalClientes
    : null

  const statusInfo = {
    ativa:        { label: 'Plano ativo',  cn: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    inadimplente: { label: 'Inadimplente', cn: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    cancelada:    { label: 'Cancelado',    cn: 'bg-muted text-muted-foreground border-border' },
  }[plano.statusAssinatura] ?? { label: 'Cancelado', cn: 'bg-muted text-muted-foreground border-border' }

  const pagamentosVisiveis = verTodosPagamentos ? pagamentos : pagamentos.slice(0, PAGAMENTOS_VISIVEIS)

  return (
    <LayoutShell>
      <div className="max-w-5xl space-y-6">

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Plano</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie sua assinatura, pagamentos e acompanhe o uso da sua conta.
          </p>
        </div>

        {/* Banner: downgrade pendente */}
        {planoLoja?.planoPendente && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Downgrade agendado</p>
                <p className="text-xs text-blue-800 dark:text-blue-400 mt-0.5">
                  Em {fmtData(planoLoja.planoPendente.efetivaDm)}, seu plano mudará para{' '}
                  <strong>{planoLoja.planoPendente.nome}</strong>{' '}
                  (R$ {Number(planoLoja.planoPendente.precoMensal).toFixed(2).replace('.', ',')}/mês).
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-700 dark:text-blue-400 shrink-0 text-xs"
              onClick={handleCancelarDowngradePendente}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Banner inadimplente */}
        {plano.statusAssinatura === 'inadimplente' && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Pagamento pendente</p>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                Seu pagamento foi recusado. Clique em <strong>Assinar / Atualizar pagamento</strong> para regularizar sua assinatura.
              </p>
            </div>
          </div>
        )}

        {/* ── Linha 1: Hero + Uso ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Card hero — plano atual (3/5) */}
          <div
            className="lg:col-span-3 relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between min-h-[200px]"
            style={{
              background: 'linear-gradient(135deg, #1F4E79 0%, #1a4268 40%, #196b54 80%, #2E9E75 100%)',
            }}
          >
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none" aria-hidden>
              <Crown className="h-28 w-28 text-white" />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <Zap className="h-3 w-3" />
                Seu plano atual
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {planoLoja?.planoNome ?? 'Plano'}
                </h2>
                <p className="text-sm text-white/70 mt-1">
                  {planoLoja?.limiteClientes != null
                    ? `Até ${planoLoja.limiteClientes} clientes · ${fmtValor(plano.valorMensalidade)}/mês`
                    : 'Gerencie sua assinatura abaixo'}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6">
              <Button
                onClick={() => setPlanosAberto(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm gap-2"
                variant="outline"
              >
                Ver opções de plano
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Card uso da conta (2/5) */}
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Uso da conta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {planoLoja?.limiteClientes != null ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Clientes cadastrados</span>
                      <span className={cn(
                        'font-semibold',
                        planoLoja.totalClientes >= planoLoja.limiteClientes ? 'text-destructive' : 'text-foreground',
                      )}>
                        {planoLoja.totalClientes} / {planoLoja.limiteClientes}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-[#2E9E75]',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">{Math.round(pct)}% utilizado</p>
                  </div>

                  <div className={cn(
                    'rounded-lg px-3 py-2.5 text-xs',
                    restantes != null && restantes <= 0
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {restantes != null && restantes <= 0
                      ? 'Você atingiu o limite de clientes do seu plano atual. Faça upgrade para continuar.'
                      : `Você ainda pode cadastrar ${restantes} cliente${restantes !== 1 ? 's' : ''} no seu plano atual!`}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Limite de clientes não definido.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Linha 2: Resumo da assinatura (full width) ─────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Resumo da assinatura</CardTitle>
              <Badge className={cn('gap-1.5 text-xs font-medium', statusInfo.cn)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor mensal</p>
                  <p className="text-lg font-bold tracking-tight mt-0.5">{fmtValor(plano.valorMensalidade)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próxima cobrança</p>
                  <p className="text-sm font-semibold mt-0.5">{fmtData(plano.proximoVencimento)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300">
              A cobrança é renovada automaticamente todo mês via Stripe para você não perder o acesso.
            </div>
          </CardContent>
        </Card>

        {/* ── Linha 3: Método de pagamento + Histórico ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Card: método de pagamento */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Método de pagamento</CardTitle>
              <CardDescription className="text-xs">
                {plano.stripeSubscriptionId
                  ? 'Assinatura ativa via Stripe — cobrada automaticamente todo mês.'
                  : 'Clique em "Assinar" para configurar sua assinatura via Stripe.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {plano.stripeSubscriptionId && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Stripe</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Assinatura ativa</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
                  </div>
                )}

                <Button
                  onClick={handleAssinar}
                  disabled={processando || valorMensalidade === 0}
                  className="w-full"
                >
                  {processando
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecionando…</>
                    : plano.stripeSubscriptionId
                      ? 'Atualizar pagamento / Trocar plano'
                      : 'Assinar com Stripe'}
                </Button>

                {valorMensalidade === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Valor da mensalidade não configurado. Entre em contato com o suporte.
                  </p>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-2 border-t mt-auto">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Pagamento 100% seguro processado pela Stripe.
              </p>
            </CardContent>
          </Card>

          {/* Card: histórico de pagamentos */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10 flex-1 flex items-center justify-center">
                  Nenhum pagamento registrado ainda.
                </p>
              ) : (
                <>
                  <div className="divide-y text-sm flex-1">
                    {pagamentosVisiveis.map(p => {
                      const st = PAGTO_STATUS[p.status]
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              {p.tipo === 'card'
                                ? <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                : <QrCode     className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{fmtValor(p.valor)}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.descricao ?? (p.tipo === 'card' ? 'Cartão' : 'Pix')} · {fmtDataCurta(p.criadoEm)}
                              </p>
                            </div>
                          </div>
                          {st && (
                            <Badge className={cn('gap-1 text-[11px] shrink-0', st.badgeCn)}>
                              {st.icon}
                              {st.label}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {pagamentos.length > PAGAMENTOS_VISIVEIS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground"
                      onClick={() => setVerTodosPagamentos(v => !v)}
                    >
                      {verTodosPagamentos ? 'Ver menos' : `Ver todos (${pagamentos.length})`}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialog: opções de plano ───────────────────────────────────────── */}
      <Dialog open={planosAberto} onOpenChange={setPlanosAberto}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-lg">Escolha seu plano</DialogTitle>
            </DialogHeader>
          </div>

          <div className="mx-6 mt-3 mb-1 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15 px-4 py-2.5">
            <p className="text-sm font-medium text-foreground">
              Mais clientes, mais automação, menos trabalho manual.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mude de plano a qualquer momento, sem burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4">
            {catalogo.map(p => {
              const isCurrent     = planoLoja?.planoSlug === p.slug
              const isPendingDown = planoLoja?.planoPendente?.slug === p.slug
              const valorAtual    = planoLoja?.valorMensalidade ? Number(planoLoja.valorMensalidade) : null
              const isUpgrade     = valorAtual != null && Number(p.precoMensal) > valorAtual && !isCurrent
              const isDowngrade   = valorAtual != null && Number(p.precoMensal) < valorAtual && !isCurrent
              const isPro         = p.slug === 'pro'

              const FEATURE_LABELS: Record<string, string> = {
                relatorio_periodico:  'Relatório periódico',
                cupons_reativacao:    'Cupons de reativação',
                alertas_automaticos:  'Alertas automáticos',
                exportacao_pdf_excel: 'Exportação PDF/Excel',
                painel_central_rede:  'Painel central da rede',
              }
              const SUPORTE_LABEL: Record<string, string> = {
                chat:             'Suporte por chat',
                prioritario:      'Suporte prioritário',
                gerente_dedicado: 'Gerente de conta dedicado',
              }

              return (
                <div
                  key={p.slug}
                  className={cn(
                    'rounded-xl border p-4 flex flex-col gap-3',
                    isCurrent && 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20',
                    isPro && !isCurrent && 'border-primary ring-2 ring-primary/70 bg-primary/5 shadow-sm',
                    !isCurrent && !isPro && 'border-border',
                  )}
                >
                  <div className="h-5">
                    {isCurrent ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                        ✓ Plano atual
                      </Badge>
                    ) : isPro ? (
                      <Badge className="text-[10px] h-4 px-1.5 py-0 bg-primary text-primary-foreground">
                        ⭐ Mais popular
                      </Badge>
                    ) : isPendingDown ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-blue-400 text-blue-600 dark:text-blue-400">
                        Agendado
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <p className={cn('font-bold text-base', isPro && !isCurrent && 'text-primary')}>{p.nome}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-bold tracking-tight">
                        R$ {Number(p.precoMensal).toFixed(0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.slug === 'rede' ? '/unid/mês' : '/mês'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Até {p.limiteClientes} clientes{p.slug === 'rede' ? ' por unidade' : ''}
                    </p>
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {Object.entries(p.features)
                      .filter(([k]) => k in FEATURE_LABELS)
                      .map(([k, v]) => (
                        <li key={k} className="flex items-center gap-2 text-xs">
                          {v
                            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            : <XCircle    className="h-3.5 w-3.5 text-muted-foreground/25 shrink-0" />}
                          <span className={cn(v ? 'text-foreground' : 'text-muted-foreground/50 line-through')}>
                            {FEATURE_LABELS[k]}
                          </span>
                        </li>
                      ))}
                    {p.features.suporte_tipo && (
                      <li className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{SUPORTE_LABEL[p.features.suporte_tipo] ?? p.features.suporte_tipo}</span>
                      </li>
                    )}
                    {p.features.descricao && (
                      <li className="text-[11px] text-muted-foreground italic pt-1 leading-snug">
                        {p.features.descricao}
                      </li>
                    )}
                  </ul>

                  <div className="mt-auto pt-1">
                    {isCurrent ? (
                      <Button size="sm" className="w-full" variant="outline" disabled>Plano atual</Button>
                    ) : !p.selfServe ? (
                      <Button size="sm" className="w-full" variant="outline"
                        onClick={() => { setPlanosAberto(false); setSuporteAberto(true) }}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        Entrar em contato
                      </Button>
                    ) : isPendingDown ? (
                      <Button size="sm" className="w-full" variant="outline" disabled>
                        Downgrade agendado
                      </Button>
                    ) : isUpgrade ? (
                      <Button size="sm" className={cn('w-full', isPro && 'font-semibold shadow-sm')}
                        onClick={() => handleUpgrade(p.slug)} disabled={aplicandoPlano}>
                        {aplicandoPlano
                          ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
                        Fazer upgrade
                      </Button>
                    ) : isDowngrade ? (
                      <Button size="sm" className="w-full" variant="outline"
                        onClick={() => handleDowngrade(p.slug)} disabled={aplicandoPlano}>
                        {aplicandoPlano
                          ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          : <TrendingDown className="h-3.5 w-3.5 mr-1.5" />}
                        Fazer downgrade
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full"
                        onClick={() => handleUpgrade(p.slug)} disabled={aplicandoPlano}>
                        Selecionar plano
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Upgrade imediato
              </span>
              <span className="opacity-30 select-none">·</span>
              <span>Downgrade no próximo vencimento</span>
              <span className="opacity-30 select-none">·</span>
              <span>Sem taxa de setup</span>
              <span className="opacity-30 select-none">·</span>
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: suporte ───────────────────────────────────────────────── */}
      <Dialog open={suporteAberto} onOpenChange={setSuporteAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como podemos ajudar?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <a href="https://wa.me/5511983202160" target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-center w-48">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Falar no WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Resposta rápida</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
