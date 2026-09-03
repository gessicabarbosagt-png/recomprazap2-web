'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Script from 'next/script'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  CreditCard, QrCode, CheckCircle, XCircle, Clock, Loader2,
  Copy, RefreshCw, AlertTriangle, ShieldCheck, MessageCircle, CalendarDays, ExternalLink,
  Star, Users, TrendingUp, TrendingDown, DollarSign, Crown, ArrowRight, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'

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
  mpSubscriptionId: string | null
  mpPaymentMethod: 'card' | 'pix' | null
  mpCardLastFour: string | null
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
  pixQrCode: string | null
  pixQrCodeBase64: string | null
  pixExpiraEm: string | null
  criadoEm: string
}

interface PixGerado {
  id: string
  pixQrCode: string | null
  pixQrCodeBase64: string | null
  pixExpiraEm: string | null
  valor: string
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

// ── CardForm do Mercado Pago ────────────────────────────────────────────────

interface CardFormProps {
  valorMensalidade: number
  onToken: (token: string, lastFour: string, email: string) => void
  onCancel: () => void
  loading: boolean
}

function MpCardForm({ valorMensalidade, onToken, onCancel, loading }: CardFormProps) {
  const formRef    = useRef<HTMLFormElement>(null)
  const cardFormRef = useRef<any>(null)
  const [sdkPronto, setSdkPronto] = useState(false)
  const [montado, setMontado] = useState(false)
  const [emailCartao, setEmailCartao] = useState('')

  // Refs para callbacks — lê sempre o valor mais recente sem incluir
  // onToken/emailCartao nos deps do effect de montagem (o que causaria remount).
  const onTokenRef     = useRef(onToken)
  const emailCartaoRef = useRef(emailCartao)
  useEffect(() => { onTokenRef.current = onToken }, [onToken])
  useEffect(() => { emailCartaoRef.current = emailCartao }, [emailCartao])

  // Guarda via ref (não estado) se o cardForm já foi instanciado.
  // Usar `montado` (estado) nos deps causava: setMontado(true) → re-render →
  // cleanup do effect → unmount → "Cardform already instantiated" no remount.
  const cardFormMontadoRef = useRef(false)

  const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''

  useEffect(() => {
    if ((window as any).MercadoPago) setSdkPronto(true)
  }, [])

  useEffect(() => {
    if (!sdkPronto || cardFormMontadoRef.current || !mpPublicKey) return

    cardFormMontadoRef.current = true
    const mp = new (window as any).MercadoPago(mpPublicKey, { locale: 'pt-BR' })

    cardFormRef.current = mp.cardForm({
      amount: String(valorMensalidade),
      iframe: true,
      form: {
        id: 'mp-card-form',
        cardNumber:           { id: 'mp-card-number',      placeholder: '0000 0000 0000 0000' },
        expirationDate:       { id: 'mp-expiration-date',  placeholder: 'MM/AA' },
        securityCode:         { id: 'mp-security-code',    placeholder: 'CVV' },
        cardholderName:       { id: 'mp-cardholder-name',  placeholder: 'Nome no cartão' },
        issuer:               { id: 'mp-issuer',            placeholder: 'Banco' },
        installments:         { id: 'mp-installments' },
        identificationType:   { id: 'mp-doc-type' },
        identificationNumber: { id: 'mp-doc-number',       placeholder: '000.000.000-00' },
        cardholderEmail:      { id: 'mp-cardholder-email', placeholder: 'e-mail' },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) toast.error('Erro ao montar formulário de cartão')
          else setMontado(true)
        },
        onSubmit: async (event: any) => {
          event.preventDefault()
          const formData = cardFormRef.current?.getCardFormData()
          if (!formData?.token) {
            toast.error('Não foi possível tokenizar o cartão. Verifique os dados.')
            return
          }
          const lastFour = formData.cardNumber?.slice(-4) ?? ''
          const email    = formData.cardholderEmail ?? emailCartaoRef.current
          onTokenRef.current(formData.token, lastFour, email)
        },
      },
    })

    return () => {
      try { cardFormRef.current?.unmount?.() } catch { /* SDK pode lançar durante cleanup */ }
      cardFormMontadoRef.current = false
      setMontado(false)
    }
  }, [sdkPronto, mpPublicKey, valorMensalidade])

  // IMPORTANTE: esse effect DEVE ficar depois do cardForm effect.
  // React roda cleanups na ordem de declaração dos effects, então colocando
  // o suppressor por último, seu removeEventListener só executa APÓS o unmount()
  // do cardForm — mantendo o handler ativo durante todo o cleanup do SDK.
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message === 'Script error.' && !e.filename) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('error', handler, true)
    return () => window.removeEventListener('error', handler, true)
  }, [])

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkPronto(true)}
      />

      <form id="mp-card-form" ref={formRef} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mp-card-number">Número do cartão</Label>
          <div id="mp-card-number" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-expiration-date">Validade</Label>
            <div id="mp-expiration-date" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-security-code">CVV</Label>
            <div id="mp-security-code" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-cardholder-name">Nome no cartão</Label>
          <input id="mp-cardholder-name" type="text" placeholder="Nome no cartão" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-doc-type">Tipo doc.</Label>
            <select id="mp-doc-type" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-doc-number">CPF / CNPJ</Label>
            <input id="mp-doc-number" type="text" placeholder="000.000.000-00" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-cardholder-email">E-mail (para recibos)</Label>
          <input id="mp-cardholder-email" type="email" placeholder="e-mail" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>

        <select id="mp-issuer"       className="hidden" />
        <select id="mp-installments" className="hidden" />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading || !montado} className="flex-1">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando…</> : 'Confirmar cartão'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Seus dados de cartão são processados com segurança pelo Mercado Pago.
        </p>
      </form>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type View = 'loading' | 'plano' | 'add-card' | 'pix'

const PAGAMENTOS_VISIVEIS = 5

export default function PlanoPage() {
  const [statusPlano, setStatusPlano] = useState<StatusPlano | null>(null)
  const [pagamentos, setPagamentos]   = useState<Pagamento[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [view, setView]               = useState<View>('loading')
  const [processando, setProcessando] = useState(false)
  const [pixGerado, setPixGerado]     = useState<PixGerado | null>(null)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [planosAberto, setPlanosAberto] = useState(false)
  const [suporteAberto, setSuporteAberto] = useState(false)
  const [catalogo, setCatalogo] = useState<PlanoCatalogo[]>([])
  const [planoLoja, setPlanoLoja] = useState<PlanoLoja | null>(null)
  const [aplicandoPlano, setAplicandoPlano] = useState(false)
  const [verTodosPagamentos, setVerTodosPagamentos] = useState(false)
  const [cardFormKey, setCardFormKey] = useState(0)

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
      setView('plano')
    }
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  useEffect(() => {
    const pixPendente = pagamentos.find(
      p => p.tipo === 'pix' && p.status === 'pendente' && p.pixExpiraEm && new Date(p.pixExpiraEm) > new Date()
    )
    if (pixPendente) {
      setPixGerado({
        id: pixPendente.id,
        pixQrCode: pixPendente.pixQrCode,
        pixQrCodeBase64: pixPendente.pixQrCodeBase64,
        pixExpiraEm: pixPendente.pixExpiraEm,
        valor: pixPendente.valor,
      })
    }
  }, [pagamentos])

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

  async function handleToken(token: string, lastFour: string, email: string) {
    setProcessando(true)
    try {
      const ehTroca = !!statusPlano?.mpSubscriptionId
      const endpoint = ehTroca ? '/pagamentos/assinatura/cartao/trocar' : '/pagamentos/assinatura/cartao'
      await api.post(endpoint, { cardToken: token, payerEmail: email, lastFour })
      toast.success(ehTroca ? 'Cartão atualizado com sucesso!' : 'Assinatura criada com sucesso!')
      await carregarDados()
      setView('plano')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao processar cartão')
      setCardFormKey(k => k + 1)
    } finally {
      setProcessando(false)
    }
  }

  async function handleGerarPix() {
    setProcessando(true)
    try {
      const { data } = await api.post('/pagamentos/pix')
      setPixGerado(data)
      setView('pix')
      await carregarDados()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao gerar Pix')
    } finally {
      setProcessando(false)
    }
  }

  async function handleCancelarAssinatura() {
    setProcessando(true)
    try {
      await api.delete('/pagamentos/assinatura')
      toast.success('Assinatura cancelada')
      setCancelDialog(false)
      await carregarDados()
    } catch {
      toast.error('Erro ao cancelar assinatura')
    } finally {
      setProcessando(false)
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success('Código copiado!')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (carregando || view === 'loading') {
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
    ativa:        { label: 'Plano ativo',    cn: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    inadimplente: { label: 'Inadimplente',   cn: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    cancelada:    { label: 'Cancelado',      cn: 'bg-muted text-muted-foreground border-border' },
  }[plano.statusAssinatura] ?? { label: 'Cancelado', cn: 'bg-muted text-muted-foreground border-border' }

  const pagamentosVisiveis = verTodosPagamentos ? pagamentos : pagamentos.slice(0, PAGAMENTOS_VISIVEIS)

  const metodoAtivo: 'card' | 'pix' | null = plano.mpPaymentMethod

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
                Seu pagamento foi recusado. Atualize seu método de pagamento para continuar usando o RecompraZap sem interrupções.
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
            {/* Ícone decorativo — slot para imagem futura */}
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none" aria-hidden>
              <Crown className="h-28 w-28 text-white" />
            </div>

            <div className="space-y-3 relative z-10">
              {/* Badge "Seu plano atual" */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <Zap className="h-3 w-3" />
                Seu plano atual
              </div>

              {/* Nome do plano */}
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

            {/* Botão "Ver opções de plano" */}
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

                    {/* Barra de progresso */}
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

                  {/* Caixa informativa */}
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
              {/* Valor mensal */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor mensal</p>
                  <p className="text-lg font-bold tracking-tight mt-0.5">{fmtValor(plano.valorMensalidade)}</p>
                </div>
              </div>

              {/* Próxima cobrança */}
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

            {/* Banner informativo */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300">
              {metodoAtivo === 'pix'
                ? 'Gere um novo Pix a cada ciclo para manter seu acesso ativo. O pagamento não é automático.'
                : 'A cobrança é renovada automaticamente todo mês para você não perder o acesso.'}
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
                {plano.mpSubscriptionId
                  ? 'Assinatura por cartão ativa — cobrada automaticamente pelo Mercado Pago todo mês.'
                  : 'Escolha como você prefere pagar sua mensalidade.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">

              {view === 'add-card' ? (
                <MpCardForm
                  key={cardFormKey}
                  valorMensalidade={valorMensalidade}
                  onToken={handleToken}
                  onCancel={() => setView('plano')}
                  loading={processando}
                />
              ) : view === 'pix' || pixGerado ? (
                /* QR Code Pix inline */
                pixGerado && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <QrCode className="h-4 w-4" />
                      Pix do mês — {fmtValor(pixGerado.valor)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Válido até <strong>{fmtDataCurta(pixGerado.pixExpiraEm)}</strong>.
                    </p>
                    {pixGerado.pixQrCode && (
                      <>
                        <div className="flex justify-center">
                          <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <QRCodeSVG value={pixGerado.pixQrCode} size={160} level="M" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input readOnly value={pixGerado.pixQrCode} className="font-mono text-xs" />
                          <Button variant="outline" size="icon" onClick={() => copiarCodigo(pixGerado.pixQrCode!)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setView('plano')}>
                        Voltar
                      </Button>
                      <Button size="sm" className="flex-1" onClick={handleGerarPix} disabled={processando}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar novo Pix
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {/* Dois cards selecionáveis: Cartão | Pix */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Cartão */}
                    <button
                      type="button"
                      onClick={() => setView('add-card')}
                      disabled={valorMensalidade === 0}
                      className={cn(
                        'relative rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        metodoAtivo === 'card'
                          ? 'border-[#2E9E75] ring-1 ring-[#2E9E75] bg-[#2E9E75]/5 dark:bg-[#2E9E75]/10'
                          : 'border-border hover:border-muted-foreground/40',
                        valorMensalidade === 0 && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {metodoAtivo === 'card' && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#2E9E75] flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </span>
                      )}
                      <CreditCard className="h-5 w-5 mb-2 text-muted-foreground" />
                      <p className="text-xs font-semibold">Cartão de crédito</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {metodoAtivo === 'card' && plano.mpCardLastFour
                          ? `•••• ${plano.mpCardLastFour}`
                          : 'Cobrança automática'}
                      </p>
                    </button>

                    {/* Pix */}
                    <button
                      type="button"
                      onClick={handleGerarPix}
                      disabled={processando || valorMensalidade === 0}
                      className={cn(
                        'relative rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        metodoAtivo === 'pix'
                          ? 'border-[#2E9E75] ring-1 ring-[#2E9E75] bg-[#2E9E75]/5 dark:bg-[#2E9E75]/10'
                          : 'border-border hover:border-muted-foreground/40',
                        (processando || valorMensalidade === 0) && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {metodoAtivo === 'pix' && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#2E9E75] flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {processando
                        ? <Loader2 className="h-5 w-5 mb-2 text-muted-foreground animate-spin" />
                        : <QrCode className="h-5 w-5 mb-2 text-muted-foreground" />}
                      <p className="text-xs font-semibold">Pix</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {pixGerado ? 'Ver QR Code pendente' : 'Pagar manualmente'}
                      </p>
                    </button>
                  </div>

                  {/* Botões de ação secundários */}
                  {plano.mpSubscriptionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
                      onClick={() => setCancelDialog(true)}
                    >
                      Cancelar assinatura
                    </Button>
                  )}

                  {valorMensalidade === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Valor da mensalidade não configurado. Entre em contato com o suporte.
                    </p>
                  )}
                </div>
              )}

              {/* Rodapé de segurança */}
              {view === 'plano' && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-2 border-t mt-auto">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Seus dados são protegidos e 100% seguros.
                </p>
              )}
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
          <div className="grid grid-cols-2 gap-4 mt-4">
            <a href="https://wa.me/5511983202160" target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-center">
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
            <a href="https://calendly.com/gessicabarbosa-gt" target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Agendar demonstração</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conheça mais</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: cancelar assinatura ──────────────────────────────────── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancelar assinatura
            </DialogTitle>
            <DialogDescription>
              Ao cancelar, a cobrança automática pelo cartão será encerrada. Você ainda poderá pagar manualmente via Pix em meses futuros.
              O acesso continua até o fim do período já pago.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setCancelDialog(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancelarAssinatura} disabled={processando}>
              {processando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelando…</> : 'Confirmar cancelamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
