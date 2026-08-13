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
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  CreditCard, QrCode, CheckCircle, XCircle, Clock, Loader2,
  Copy, RefreshCw, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ativa:       { label: 'Ativa',        className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  inadimplente:{ label: 'Inadimplente', className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  cancelada:   { label: 'Cancelada',    className: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
}

const PAGTO_STATUS: Record<string, { label: string; icon: React.ReactNode }> = {
  aprovado: { label: 'Aprovado',   icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> },
  pendente: { label: 'Pendente',   icon: <Clock        className="h-3.5 w-3.5 text-amber-500" /> },
  recusado: { label: 'Recusado',   icon: <XCircle      className="h-3.5 w-3.5 text-destructive" /> },
  cancelado:{ label: 'Cancelado',  icon: <XCircle      className="h-3.5 w-3.5 text-muted-foreground" /> },
}

// ── Componente do CardForm do Mercado Pago ────────────────────────────────────

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

  const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''

  useEffect(() => {
    // Detecta quando o SDK já foi carregado (pode ter sido carregado antes)
    if ((window as any).MercadoPago) setSdkPronto(true)
  }, [])

  useEffect(() => {
    if (!sdkPronto || montado || !mpPublicKey) return

    const mp = new (window as any).MercadoPago(mpPublicKey, { locale: 'pt-BR' })

    cardFormRef.current = mp.cardForm({
      amount: String(valorMensalidade),
      iframe: false,
      form: {
        id: 'mp-card-form',
        cardNumber:         { id: 'mp-card-number',      placeholder: '0000 0000 0000 0000' },
        expirationDate:     { id: 'mp-expiration-date',  placeholder: 'MM/AA' },
        securityCode:       { id: 'mp-security-code',    placeholder: 'CVV' },
        cardholderName:     { id: 'mp-cardholder-name',  placeholder: 'Nome no cartão' },
        issuer:             { id: 'mp-issuer',            placeholder: 'Banco' },
        installments:       { id: 'mp-installments' },
        identificationType: { id: 'mp-doc-type' },
        identificationNumber: { id: 'mp-doc-number',     placeholder: '000.000.000-00' },
        cardholderEmail:    { id: 'mp-cardholder-email', placeholder: 'e-mail' },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) toast.error('Erro ao montar formulário de cartão')
        },
        onSubmit: async (event: any) => {
          event.preventDefault()
          const formData = cardFormRef.current?.getCardFormData()
          if (!formData?.token) {
            toast.error('Não foi possível tokenizar o cartão. Verifique os dados.')
            return
          }
          const lastFour = formData.cardNumber?.slice(-4) ?? ''
          const email    = formData.cardholderEmail ?? emailCartao
          onToken(formData.token, lastFour, email)
        },
      },
    })
    setMontado(true)

    return () => {
      cardFormRef.current?.unmount?.()
    }
  }, [sdkPronto, montado, mpPublicKey, valorMensalidade, onToken, emailCartao])

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
          <div
            id="mp-card-number"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-expiration-date">Validade</Label>
            <div
              id="mp-expiration-date"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-security-code">CVV</Label>
            <div
              id="mp-security-code"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-cardholder-name">Nome no cartão</Label>
          <div
            id="mp-cardholder-name"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-doc-type">Tipo doc.</Label>
            <select
              id="mp-doc-type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-doc-number">CPF / CNPJ</Label>
            <div
              id="mp-doc-number"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-cardholder-email">E-mail (para recibos)</Label>
          <div
            id="mp-cardholder-email"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Campos ocultos obrigatórios pelo SDK */}
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
          Seus dados de cartão são processados com segurança pelo Mercado Pago. Não armazenamos o número do cartão.
        </p>
      </form>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type View = 'loading' | 'plano' | 'add-card' | 'pix'

export default function PlanoPage() {
  const [statusPlano, setStatusPlano] = useState<StatusPlano | null>(null)
  const [pagamentos, setPagamentos]   = useState<Pagamento[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [view, setView]               = useState<View>('loading')
  const [processando, setProcessando] = useState(false)
  const [pixGerado, setPixGerado]     = useState<PixGerado | null>(null)
  const [cancelDialog, setCancelDialog] = useState(false)

  const carregarDados = useCallback(async () => {
    try {
      const [planoRes, pagRes] = await Promise.all([
        api.get('/pagamentos/plano'),
        api.get('/pagamentos'),
      ])
      setStatusPlano(planoRes.data)
      setPagamentos(pagRes.data)
    } catch {
      toast.error('Erro ao carregar dados do plano')
    } finally {
      setCarregando(false)
      setView('plano')
    }
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Mostra pix ativo se houver um pendente na lista
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

  async function handleToken(token: string, lastFour: string, email: string) {
    setProcessando(true)
    try {
      const ehTroca = !!statusPlano?.mpSubscriptionId
      const endpoint = ehTroca
        ? '/pagamentos/assinatura/cartao/trocar'
        : '/pagamentos/assinatura/cartao'
      await api.post(endpoint, { cardToken: token, payerEmail: email, lastFour })
      toast.success(ehTroca ? 'Cartão atualizado com sucesso!' : 'Assinatura criada com sucesso!')
      await carregarDados()
      setView('plano')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao processar cartão')
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

  if (carregando || view === 'loading') {
    return (
      <LayoutShell>
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </LayoutShell>
    )
  }

  const plano = statusPlano!
  const statusBadge = STATUS_BADGE[plano.statusAssinatura] ?? STATUS_BADGE['cancelada']
  const valorMensalidade = plano.valorMensalidade ? Number(plano.valorMensalidade) : 0

  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meu Plano</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua assinatura e histórico de pagamentos</p>
        </div>

        {/* Banner inadimplente */}
        {plano.statusAssinatura === 'inadimplente' && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Pagamento pendente</p>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                Seu pagamento foi recusado. Atualize seu método de pagamento para continuar usando o RecompraZap sem interrupções.
              </p>
            </div>
          </div>
        )}

        {/* Status do plano */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">Resumo do plano</CardTitle>
              <Badge className={`${statusBadge.className} gap-1`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusBadge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor mensal</span>
              <span className="font-medium">{fmtValor(plano.valorMensalidade)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Próxima cobrança</span>
              <span>{fmtData(plano.proximoVencimento)}</span>
            </div>
            {plano.mpPaymentMethod && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método ativo</span>
                <span className="flex items-center gap-1.5">
                  {plano.mpPaymentMethod === 'card' ? (
                    <><CreditCard className="h-3.5 w-3.5" /> Cartão •••• {plano.mpCardLastFour}</>
                  ) : (
                    <><QrCode className="h-3.5 w-3.5" /> Pix</>
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações de pagamento */}
        {view === 'plano' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Método de pagamento</CardTitle>
              <CardDescription>
                {plano.mpSubscriptionId
                  ? 'Sua assinatura por cartão está ativa. O Mercado Pago cobra automaticamente todo mês.'
                  : 'Adicione um cartão para cobrança automática, ou gere um Pix para pagar manualmente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plano.mpSubscriptionId ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setView('add-card')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Trocar cartão
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => setCancelDialog(true)}
                  >
                    Cancelar assinatura
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() => setView('add-card')}
                    disabled={valorMensalidade === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Adicionar cartão
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleGerarPix}
                    disabled={processando || valorMensalidade === 0}
                  >
                    {processando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                    {pixGerado ? 'Ver Pix pendente' : 'Pagar via Pix'}
                  </Button>
                </div>
              )}

              {!plano.mpSubscriptionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground text-xs"
                  onClick={handleGerarPix}
                  disabled={processando || valorMensalidade === 0}
                >
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  {pixGerado ? 'Ver QR Code Pix do mês' : 'Ou pague este mês via Pix'}
                </Button>
              )}

              {valorMensalidade === 0 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Valor da mensalidade não configurado. Entre em contato com o suporte.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulário de cartão */}
        {view === 'add-card' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {statusPlano?.mpSubscriptionId ? 'Trocar cartão' : 'Adicionar cartão'}
              </CardTitle>
              <CardDescription>
                Mensalidade de {fmtValor(plano.valorMensalidade)} cobrada automaticamente todo mês.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MpCardForm
                valorMensalidade={valorMensalidade}
                onToken={handleToken}
                onCancel={() => setView('plano')}
                loading={processando}
              />
            </CardContent>
          </Card>
        )}

        {/* QR Code Pix */}
        {(view === 'pix' || pixGerado) && view !== 'add-card' && pixGerado && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pix do mês — {fmtValor(pixGerado.valor)}
              </CardTitle>
              <CardDescription>
                Escaneie o QR Code ou copie o código Pix abaixo. Válido até{' '}
                <strong>{fmtDataCurta(pixGerado.pixExpiraEm)}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pixGerado.pixQrCode ? (
                <>
                  <div className="flex justify-center">
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                      <QRCodeSVG value={pixGerado.pixQrCode} size={200} level="M" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={pixGerado.pixQrCode}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copiarCodigo(pixGerado.pixQrCode!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  QR Code não disponível. Use o código copia-e-cola acima.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setView('plano')}
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleGerarPix}
                  disabled={processando}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar novo Pix
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum pagamento registrado ainda.</p>
            ) : (
              <div className="divide-y text-sm">
                {pagamentos.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      {p.tipo === 'card'
                        ? <CreditCard className="h-4 w-4 text-muted-foreground" />
                        : <QrCode     className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium">{fmtValor(p.valor)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.descricao ?? (p.tipo === 'card' ? 'Cartão' : 'Pix')} · {fmtDataCurta(p.criadoEm)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {PAGTO_STATUS[p.status]?.icon}
                      <span className="text-muted-foreground">{PAGTO_STATUS[p.status]?.label ?? p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: cancelar assinatura */}
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
