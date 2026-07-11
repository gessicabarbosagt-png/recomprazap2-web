'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Send, MessageSquare, Loader2, RefreshCw, Wifi, WifiOff, Trash2, ShoppingBag, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusJornada = 'aguardando' | 'orcamento_enviado' | 'comprou' | 'nao_comprou'

interface PedidoAberto {
  id: string
  statusJornada: StatusJornada
  valor: number | null
  produtoNome: string | null
  createdAt: string
}

interface Mensagem {
  id: string
  clienteId?: string
  telefone: string
  clienteNome?: string
  conteudo: string
  direcao: 'recebida' | 'enviada'
  tipo?: 'lembrete' | 'manual'
  lida?: boolean
  criadoEm: string
  origemLead?: string | null
}

interface Conversa {
  telefone: string
  clienteId: string | null
  clienteNome: string
  ultimaMensagem: string
  ultimaData: string
  naoLidas: number
  origemLead?: string | null
}

type StatusWA = 'conectado' | 'aguardando' | 'desconectado'

// ─── Helpers de data/hora ─────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDataCurta(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return formatHora(iso)
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatDataDivisor(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function agruparPorData(mensagens: Mensagem[]): { data: string; itens: Mensagem[] }[] {
  const grupos: Record<string, Mensagem[]> = {}
  for (const m of mensagens) {
    const chave = new Date(m.criadoEm).toDateString()
    if (!grupos[chave]) grupos[chave] = []
    grupos[chave].push(m)
  }
  return Object.entries(grupos).map(([, itens]) => ({
    data: formatDataDivisor(itens[0].criadoEm),
    itens,
  }))
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MensagensPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [texto, setTexto] = useState('')
  const [statusWA, setStatusWA] = useState<StatusWA>('desconectado')
  const [atualizando, setAtualizando] = useState(false)
  const [pedidoAberto, setPedidoAberto] = useState<PedidoAberto | null>(null)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [salvandoJornada, setSalvandoJornada] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversaAtivaRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)

  // ── Scroll ──────────────────────────────────────────────────────────────────

  function isNearBottom() {
    const el = scrollAreaRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  function scrollToBottom(instant = false) {
    bottomRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' })
  }

  useEffect(() => {
    if (conversaAtiva !== conversaAtivaRef.current) {
      conversaAtivaRef.current = conversaAtiva
      setTimeout(() => scrollToBottom(true), 0)
    }
    // Busca pedido aberto da conversa selecionada
    setPedidoAberto(null)
    setStatusMenuOpen(false)
    const clienteId = conversas.find((c) => c.telefone === conversaAtiva)?.clienteId
    if (clienteId) {
      api.get(`/pedidos/cliente/${clienteId}/aberto`)
        .then(({ data }) => setPedidoAberto(data ?? null))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaAtiva])

  useEffect(() => {
    const ativas = mensagens.filter((m) => m.telefone === conversaAtiva)
    if (ativas.length > prevCountRef.current && isNearBottom()) {
      scrollToBottom()
    }
    prevCountRef.current = ativas.length
  }, [mensagens, conversaAtiva])

  // ── Polling de mensagens (5s) ────────────────────────────────────────────────

  const fetchMensagens = useCallback(async (silencioso = true) => {
    try {
      const { data } = await api.get('/whatsapp/mensagens')
      setMensagens(Array.isArray(data) ? data : (data.mensagens ?? []))
    } catch {
      if (!silencioso) toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Polling de status do WhatsApp (10s) ──────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/status')
      setStatusWA(data.status ?? 'desconectado')
    } catch {
      setStatusWA('desconectado')
    }
  }, [])

  useEffect(() => {
    fetchMensagens(false)
    fetchStatus()

    const msgInterval = setInterval(() => fetchMensagens(true), 5_000)
    const statusInterval = setInterval(fetchStatus, 10_000)

    return () => {
      clearInterval(msgInterval)
      clearInterval(statusInterval)
    }
  }, [fetchMensagens, fetchStatus])

  // ── Refresh manual ───────────────────────────────────────────────────────────

  async function handleRefresh() {
    setAtualizando(true)
    await Promise.all([fetchMensagens(false), fetchStatus()])
    setAtualizando(false)
  }

  // ── Conversas derivadas das mensagens ────────────────────────────────────────

  const conversas: Conversa[] = (() => {
    const mapa: Record<string, Mensagem[]> = {}
    for (const m of mensagens) {
      if (!mapa[m.telefone]) mapa[m.telefone] = []
      mapa[m.telefone].push(m)
    }
    return Object.entries(mapa)
      .map(([telefone, msgs]) => {
        const sorted = [...msgs].sort(
          (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
        )
        return {
          telefone,
          clienteId: sorted[0].clienteId ?? null,
          clienteNome: sorted[0].clienteNome ?? telefone,
          ultimaMensagem: sorted[0].conteudo,
          ultimaData: sorted[0].criadoEm,
          naoLidas: msgs.filter((m) => m.direcao === 'recebida' && !m.lida).length,
          origemLead: sorted[0].origemLead ?? null,
        }
      })
      .sort((a, b) => new Date(b.ultimaData).getTime() - new Date(a.ultimaData).getTime())
  })()

  const mensagensAtivas = mensagens
    .filter((m) => m.telefone === conversaAtiva)
    .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())

  const conversaAtivaInfo = conversas.find((c) => c.telefone === conversaAtiva)
  const grupos = agruparPorData(mensagensAtivas)

  // ── Envio de mensagem ────────────────────────────────────────────────────────

  async function handleEnviar() {
    if (!texto.trim() || !conversaAtiva) return
    setEnviando(true)
    try {
      await api.post('/whatsapp/mensagens', { telefone: conversaAtiva, conteudo: texto.trim() })
      setTexto('')
      await fetchMensagens(true)
      inputRef.current?.focus()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar mensagem')
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  // ── Atualizar jornada do pedido ──────────────────────────────────────────────

  async function atualizarJornada(novoStatus: StatusJornada, valor?: number | null) {
    if (!pedidoAberto) return
    setSalvandoJornada(true)
    try {
      const { data } = await api.patch(`/pedidos/${pedidoAberto.id}/jornada`, {
        statusJornada: novoStatus,
        valor: valor ?? undefined,
      })
      setPedidoAberto(
        ['comprou', 'nao_comprou'].includes(novoStatus)
          ? null
          : { ...pedidoAberto, statusJornada: data.statusJornada, valor: data.valor },
      )
      setStatusMenuOpen(false)
      setValorInput('')
      toast.success('Status do pedido atualizado')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar pedido')
    } finally {
      setSalvandoJornada(false)
    }
  }

  // ── Excluir conversa ─────────────────────────────────────────────────────────

  async function handleExcluirConversa() {
    if (!conversaAtivaInfo?.clienteId) return
    const nome = conversaAtivaInfo.clienteNome
    if (!confirm(`Excluir toda a conversa com ${nome}?\n\nAs mensagens serão removidas do inbox. Esta ação não pode ser desfeita.`)) return

    setExcluindo(true)
    try {
      await api.delete(`/whatsapp/conversas/${conversaAtivaInfo.clienteId}`)
      toast.success(`Conversa com ${nome} excluída`)
      setConversaAtiva(null)
      await fetchMensagens(true)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir conversa')
    } finally {
      setExcluindo(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <LayoutShell>
      <div className="flex -m-8 overflow-hidden" style={{ height: '100vh' }}>

        {/* ── Lista de conversas ──────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 border-r flex flex-col bg-background">

          {/* Header da sidebar */}
          <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-semibold">Mensagens</h1>
              <StatusWABadge status={statusWA} />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={atualizando}
              title="Atualizar"
              className="flex-shrink-0"
            >
              <RefreshCw className={cn('h-4 w-4', atualizando && 'animate-spin')} />
            </Button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
                <MessageSquare className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              conversas.map((c) => (
                <button
                  key={c.telefone}
                  onClick={() => setConversaAtiva(c.telefone)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex gap-3 items-start border-b transition-colors hover:bg-accent',
                    conversaAtiva === c.telefone && 'bg-accent'
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {c.clienteNome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{c.clienteNome}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDataCurta(c.ultimaData)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{c.ultimaMensagem}</p>
                      {c.naoLidas > 0 && (
                        <Badge className="h-4 min-w-4 px-1 text-[10px] flex-shrink-0">
                          {c.naoLidas}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Área do chat ────────────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0 bg-background">
          {conversaAtiva && conversaAtivaInfo ? (
            <>
              {/* Header da conversa */}
              <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {conversaAtivaInfo.clienteNome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{conversaAtivaInfo.clienteNome}</p>
                    <OrigemLeadBadge origem={conversaAtivaInfo.origemLead} />
                    {pedidoAberto && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setStatusMenuOpen((o) => !o)}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          <ShoppingBag className="h-2.5 w-2.5" />
                          {JORNADA_LABELS[pedidoAberto.statusJornada]}
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        {statusMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md w-52 py-1 text-sm">
                            {JORNADA_OPCOES.map((op) => (
                              <button
                                key={op.value}
                                type="button"
                                disabled={salvandoJornada}
                                onClick={() => {
                                  setStatusMenuOpen(false)
                                  if (op.value === 'comprou') {
                                    setValorInput('')
                                    // mostra via estado separado
                                    setSalvandoJornada(false)
                                    setPedidoAberto({ ...pedidoAberto, statusJornada: 'comprou' })
                                  } else {
                                    atualizarJornada(op.value as StatusJornada)
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                              >
                                {pedidoAberto.statusJornada === op.value
                                  ? <Check className="h-3 w-3" />
                                  : <span className="w-3" />}
                                {op.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{conversaAtiva}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleExcluirConversa}
                  disabled={excluindo || !conversaAtivaInfo.clienteId}
                  title="Excluir conversa"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  {excluindo
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </Button>
              </div>

              {/* Banner de confirmação de compra com valor */}
              {pedidoAberto?.statusJornada === 'comprou' && (
                <div className="px-4 py-2 border-b bg-emerald-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-emerald-700 font-medium">Marcar como comprou — Valor (opcional):</span>
                  <input
                    id="valor-comprou-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="w-24 rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    onKeyDown={(e) => e.key === 'Enter' && atualizarJornada('comprou', valorInput ? parseFloat(valorInput) : null)}
                  />
                  <Button
                    size="sm"
                    className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => atualizarJornada('comprou', valorInput ? parseFloat(valorInput) : null)}
                    disabled={salvandoJornada}
                  >
                    {salvandoJornada ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => setPedidoAberto(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Histórico */}
              <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {grupos.map(({ data, itens }) => (
                  <div key={data}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground px-2">{data}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-1.5">
                      {itens.map((m) => {
                        const isEnviada = m.direcao === 'enviada'
                        const isLembrete = m.tipo === 'lembrete'
                        return (
                          <div
                            key={m.id}
                            className={cn('flex', isEnviada ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[72%] rounded-2xl px-3.5 py-2 text-sm',
                                !isEnviada && 'bg-muted text-foreground rounded-tl-sm',
                                isEnviada && !isLembrete &&
                                  'bg-primary text-primary-foreground rounded-tr-sm',
                                isEnviada && isLembrete &&
                                  'bg-blue-100 text-blue-900 rounded-tr-sm border border-blue-200'
                              )}
                            >
                              {isEnviada && isLembrete && (
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-0.5">
                                  Lembrete automático
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words leading-snug">
                                {m.conteudo}
                              </p>
                              <p
                                className={cn(
                                  'text-[10px] mt-1 text-right',
                                  !isEnviada && 'text-muted-foreground',
                                  isEnviada && !isLembrete && 'text-primary-foreground/70',
                                  isEnviada && isLembrete && 'text-blue-400'
                                )}
                              >
                                {formatHora(m.criadoEm)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Campo de envio */}
              <div className="border-t px-4 py-3 flex gap-2 flex-shrink-0">
                <Input
                  ref={inputRef}
                  placeholder="Digite uma mensagem..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={enviando}
                  className="flex-1"
                />
                <Button onClick={handleEnviar} disabled={!texto.trim() || enviando}>
                  {enviando
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          )}
        </section>
      </div>
    </LayoutShell>
  )
}

// ─── Jornada de compra ───────────────────────────────────────────────────────

const JORNADA_LABELS: Record<StatusJornada, string> = {
  aguardando:        'Aguardando',
  orcamento_enviado: 'Orçamento enviado',
  comprou:           'Comprou',
  nao_comprou:       'Não comprou',
}

const JORNADA_OPCOES: { value: StatusJornada; label: string }[] = [
  { value: 'aguardando',        label: 'Aguardando' },
  { value: 'orcamento_enviado', label: 'Orçamento enviado' },
  { value: 'comprou',           label: 'Comprou ✓' },
  { value: 'nao_comprou',       label: 'Não comprou' },
]

// ─── Badge de origem do lead ──────────────────────────────────────────────────

const ORIGENS_MSG: Record<string, { label: string; className: string }> = {
  meta_ads:  { label: 'Meta Ads',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  importado: { label: 'Importado', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function OrigemLeadBadge({ origem }: { origem?: string | null }) {
  if (!origem) return null
  const cfg = ORIGENS_MSG[origem]
  const label = cfg?.label ?? origem
  const cls = cfg?.className ?? 'bg-violet-100 text-violet-700 border-violet-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── Badge de status do WhatsApp ──────────────────────────────────────────────

function StatusWABadge({ status }: { status: StatusWA }) {
  if (status === 'conectado') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
        <Wifi className="h-3 w-3" />
        <span className="hidden sm:inline">Online</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </span>
    )
  }
  if (status === 'aguardando') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
        <Wifi className="h-3 w-3" />
        <span className="hidden sm:inline">Aguardando</span>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <WifiOff className="h-3 w-3" />
      <span className="hidden sm:inline">Offline</span>
    </span>
  )
}
