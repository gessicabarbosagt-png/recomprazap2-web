'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Send, MessageSquare, Loader2, RefreshCw, Wifi, WifiOff,
  Trash2, ShoppingBag, ChevronDown, Check, History, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusJornada = 'aguardando' | 'orcamento_enviado' | 'comprou' | 'nao_comprou'

interface Etapa {
  id: string
  nome: string
  ordem: number
  tipo: 'intermediaria' | 'final_comprou' | 'final_nao_comprou'
  ativo: boolean
}

interface PedidoAberto {
  id: string
  statusJornada: StatusJornada
  etapaId: string | null
  etapaNome: string | null
  etapaTipo: string | null
  valor: number | null
  produtoNome: string | null
  createdAt: string
}

interface PedidoFechado {
  id: string
  statusJornada: StatusJornada
  etapaId: string | null
  etapaNome: string | null
  etapaTipo: string | null
  valor: number | null
  createdAt: string
  confirmadoEm: string | null
}

interface BuscarAbertoResponse {
  pedidoAberto: PedidoAberto | null
  ultimoPedidoFechado: PedidoFechado | null
  historico: PedidoFechado[]
}

interface Mensagem {
  id: string
  clienteId?: string
  telefone: string
  clienteNome?: string
  clienteWhatsappNome?: string | null
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
  clienteWhatsappNome?: string | null
  ultimaMensagem: string
  ultimaData: string
  naoLidas: number
  origemLead?: string | null
}

function isNomeTelefone(nome: string) {
  return /^\+\d{8,15}$/.test(nome.trim())
}

function nomeDisplay(nome: string, whatsappNome?: string | null): string {
  if (isNomeTelefone(nome) && whatsappNome) return whatsappNome
  return nome
}

function whatsappTag(nome: string, whatsappNome?: string | null): string | null {
  if (!whatsappNome) return null
  if (isNomeTelefone(nome)) return null
  if (whatsappNome === nome) return null
  return whatsappNome
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

function formatDataCompleta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

function formatValor(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

function MensagensContent({ telefoneInicial }: { telefoneInicial?: string | null }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(telefoneInicial ?? null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [texto, setTexto] = useState('')
  const [statusWA, setStatusWA] = useState<StatusWA>('desconectado')
  const [atualizando, setAtualizando] = useState(false)
  const [pedidoAberto, setPedidoAberto] = useState<PedidoAberto | null>(null)
  const [ultimoPedidoFechado, setUltimoPedidoFechado] = useState<PedidoFechado | null>(null)
  const [historico, setHistorico] = useState<PedidoFechado[]>([])
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [salvandoJornada, setSalvandoJornada] = useState(false)
  const [etapaParaConfirmar, setEtapaParaConfirmar] = useState<Etapa | null>(null)
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [novoPedidoMenuOpen, setNovoPedidoMenuOpen] = useState(false)
  const [novoPedidoValor, setNovoPedidoValor] = useState('')
  const [novoPedidoMode, setNovoPedidoMode] = useState<'interesse' | 'compra' | null>(null)
  const [criandoPedido, setCriandoPedido] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const conversaAtivaRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)
  // clienteIds marcados como lidos otimisticamente nesta sessão
  const [lidasOverride, setLidasOverride] = useState<Set<string>>(new Set())
  // previne chamadas duplicadas enquanto o API ainda não respondeu
  const marcandoRef = useRef<Set<string>>(new Set())

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
      // Marca como lida ao mudar de conversa (cobre o caso do telefoneInicial)
      const clienteId = conversas.find((c) => c.telefone === conversaAtiva)?.clienteId
      marcarLida(clienteId)
    }
    // Busca pedido aberto da conversa selecionada
    setPedidoAberto(null)
    setUltimoPedidoFechado(null)
    setHistorico([])
    setStatusMenuOpen(false)
    setNovoPedidoMenuOpen(false)
    const clienteId = conversas.find((c) => c.telefone === conversaAtiva)?.clienteId
    if (clienteId) {
      api.get(`/pedidos/cliente/${clienteId}/aberto`)
        .then(({ data }) => {
          const resp = data as BuscarAbertoResponse
          setPedidoAberto(resp.pedidoAberto ?? null)
          setUltimoPedidoFechado(resp.ultimoPedidoFechado ?? null)
          setHistorico(resp.historico ?? [])
        })
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

  // ── Marcar conversa como lida ────────────────────────────────────────────────

  const marcarLida = useCallback((clienteId: string | null | undefined) => {
    if (!clienteId) return
    if (marcandoRef.current.has(clienteId)) return
    marcandoRef.current.add(clienteId)
    // Otimista: zero o contador imediatamente
    setLidasOverride((prev) => new Set([...prev, clienteId]))
    api.patch(`/whatsapp/conversas/${clienteId}/lida`).catch(() => {}).finally(() => {
      marcandoRef.current.delete(clienteId)
    })
  }, [])

  // ── Polling de mensagens (5s) ────────────────────────────────────────────────

  const fetchMensagens = useCallback(async (silencioso = true) => {
    try {
      const { data } = await api.get('/whatsapp/mensagens')
      const novas: Mensagem[] = Array.isArray(data) ? data : (data.mensagens ?? [])
      setMensagens(novas)

      // Se há conversa ativa com mensagens não lidas → marca como lida
      const ativa = conversaAtivaRef.current
      if (ativa) {
        const msg = novas.find((m) => m.telefone === ativa && m.direcao === 'recebida' && !m.lida)
        if (msg?.clienteId) marcarLida(msg.clienteId)
      }
    } catch {
      if (!silencioso) toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [marcarLida])

  // ── Carrega etapas da jornada ────────────────────────────────────────────────

  const fetchEtapas = useCallback(async () => {
    try {
      const { data } = await api.get('/etapas-jornada')
      setEtapas(Array.isArray(data) ? data : [])
    } catch {
      // silencioso — etapas são auxiliares
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
    fetchEtapas()

    const msgInterval = setInterval(() => fetchMensagens(true), 5_000)
    const statusInterval = setInterval(fetchStatus, 10_000)

    return () => {
      clearInterval(msgInterval)
      clearInterval(statusInterval)
    }
  }, [fetchMensagens, fetchStatus, fetchEtapas])

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
        const clienteId = sorted[0].clienteId ?? null
        const naoLidasServidor = msgs.filter((m) => m.direcao === 'recebida' && !m.lida).length
        return {
          telefone,
          clienteId,
          clienteNome: sorted[0].clienteNome ?? telefone,
          clienteWhatsappNome: sorted[0].clienteWhatsappNome ?? null,
          ultimaMensagem: sorted[0].conteudo,
          ultimaData: sorted[0].criadoEm,
          // Otimista: se já marcamos como lida nesta sessão, mostra 0 imediatamente
          naoLidas: clienteId && lidasOverride.has(clienteId) ? 0 : naoLidasServidor,
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

  async function atualizarJornada(etapa: Etapa, valor?: number | null) {
    if (!pedidoAberto) return
    setSalvandoJornada(true)
    try {
      await api.patch(`/pedidos/${pedidoAberto.id}/jornada`, {
        etapaId: etapa.id,
        valor: valor ?? undefined,
      })
      const isFinal = etapa.tipo === 'final_comprou' || etapa.tipo === 'final_nao_comprou'
      if (isFinal) {
        setPedidoAberto(null)
      } else {
        setPedidoAberto({
          ...pedidoAberto,
          etapaId: etapa.id,
          etapaNome: etapa.nome,
          etapaTipo: etapa.tipo,
        })
      }
      setStatusMenuOpen(false)
      setEtapaParaConfirmar(null)
      setValorInput('')
      toast.success('Status do pedido atualizado')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar pedido')
    } finally {
      setSalvandoJornada(false)
    }
  }

  // ── Criar novo pedido ────────────────────────────────────────────────────────

  async function criarNovoPedido(tipo: 'interesse' | 'compra', valor?: number | null) {
    const clienteId = conversaAtivaInfo?.clienteId
    if (!clienteId) return

    let etapaAlvo: Etapa | undefined
    if (tipo === 'interesse') {
      etapaAlvo = etapas.filter((e) => e.tipo === 'intermediaria' && e.ativo).sort((a, b) => a.ordem - b.ordem)[0]
    } else {
      etapaAlvo = etapas.find((e) => e.tipo === 'final_comprou')
    }

    if (!etapaAlvo) {
      toast.error('Nenhuma etapa configurada. Configure as etapas da jornada primeiro.')
      return
    }

    setCriandoPedido(true)
    try {
      await api.post('/pedidos', {
        clienteId,
        etapaId: etapaAlvo.id,
        valor: valor ?? undefined,
      })
      toast.success(tipo === 'interesse' ? 'Pedido de interesse registrado' : 'Compra registrada')
      setNovoPedidoMenuOpen(false)
      setNovoPedidoMode(null)
      setNovoPedidoValor('')

      // Recarrega pedido aberto
      api.get(`/pedidos/cliente/${clienteId}/aberto`)
        .then(({ data }) => {
          const resp = data as BuscarAbertoResponse
          setPedidoAberto(resp.pedidoAberto ?? null)
          setUltimoPedidoFechado(resp.ultimoPedidoFechado ?? null)
          setHistorico(resp.historico ?? [])
        })
        .catch(() => {})
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar pedido')
    } finally {
      setCriandoPedido(false)
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
                  onClick={() => {
                    setConversaAtiva(c.telefone)
                    marcarLida(c.clienteId)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 flex gap-3 items-start border-b transition-colors hover:bg-accent',
                    conversaAtiva === c.telefone && 'bg-accent'
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium">
                    {nomeDisplay(c.clienteNome, c.clienteWhatsappNome).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{nomeDisplay(c.clienteNome, c.clienteWhatsappNome)}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDataCurta(c.ultimaData)}
                      </span>
                    </div>
                    {whatsappTag(c.clienteNome, c.clienteWhatsappNome) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        &ldquo;{whatsappTag(c.clienteNome, c.clienteWhatsappNome)}&rdquo; no WhatsApp
                      </p>
                    )}
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
                  {nomeDisplay(conversaAtivaInfo.clienteNome, conversaAtivaInfo.clienteWhatsappNome).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{nomeDisplay(conversaAtivaInfo.clienteNome, conversaAtivaInfo.clienteWhatsappNome)}</p>
                    {whatsappTag(conversaAtivaInfo.clienteNome, conversaAtivaInfo.clienteWhatsappNome) && (
                      <span className="text-xs text-muted-foreground">
                        · &ldquo;{whatsappTag(conversaAtivaInfo.clienteNome, conversaAtivaInfo.clienteWhatsappNome)}&rdquo; no WhatsApp
                      </span>
                    )}
                    <OrigemLeadBadge origem={conversaAtivaInfo.origemLead} />

                    {/* Etiqueta de pedido aberto */}
                    {pedidoAberto && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setStatusMenuOpen((o) => !o); setNovoPedidoMenuOpen(false) }}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          <ShoppingBag className="h-2.5 w-2.5" />
                          {pedidoAberto.etapaNome ?? pedidoAberto.statusJornada}
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        {statusMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md w-52 py-1 text-sm">
                            {etapas.map((etapa) => (
                              <button
                                key={etapa.id}
                                type="button"
                                disabled={salvandoJornada}
                                onClick={() => {
                                  setStatusMenuOpen(false)
                                  if (etapa.tipo === 'final_comprou') {
                                    setValorInput('')
                                    setEtapaParaConfirmar(etapa)
                                  } else {
                                    atualizarJornada(etapa)
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                              >
                                {pedidoAberto.etapaId === etapa.id
                                  ? <Check className="h-3 w-3" />
                                  : <span className="w-3" />}
                                {etapa.nome}
                                {etapa.tipo !== 'intermediaria' && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">Final</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Indicador de último pedido fechado (quando sem aberto) */}
                    {!pedidoAberto && ultimoPedidoFechado && (
                      <span className={cn(
                        'text-[11px] font-medium',
                        ultimoPedidoFechado.etapaTipo === 'final_comprou' ? 'text-emerald-600' : 'text-muted-foreground',
                      )}>
                        {ultimoPedidoFechado.etapaTipo === 'final_comprou'
                          ? `Última compra: ${formatDataCompleta(ultimoPedidoFechado.createdAt)} · ${formatValor(ultimoPedidoFechado.valor)}`
                          : `Não comprou em ${formatDataCompleta(ultimoPedidoFechado.createdAt)}`
                        }
                      </span>
                    )}

                    {/* Botão histórico */}
                    {historico.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoricoOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <History className="h-3 w-3" />
                        Ver histórico ({historico.length})
                      </button>
                    )}

                    {/* Botão + Pedido (quando sem pedido aberto) */}
                    {!pedidoAberto && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setNovoPedidoMenuOpen((o) => !o); setStatusMenuOpen(false) }}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-background border-border text-foreground hover:bg-accent transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          Pedido
                        </button>
                        {novoPedidoMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md w-56 py-1 text-sm">
                            {novoPedidoMode === null ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setNovoPedidoMode('interesse')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-accent"
                                >
                                  Registrar interesse
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNovoPedidoMode('compra')}
                                  className="w-full text-left px-3 py-1.5 hover:bg-accent"
                                >
                                  Registrar compra (com valor)
                                </button>
                              </>
                            ) : (
                              <div className="px-3 py-2 space-y-2">
                                {novoPedidoMode === 'compra' && (
                                  <input
                                    autoFocus
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Valor (opcional)"
                                    value={novoPedidoValor}
                                    onChange={(e) => setNovoPedidoValor(e.target.value)}
                                    className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') criarNovoPedido('compra', novoPedidoValor ? parseFloat(novoPedidoValor) : null)
                                    }}
                                  />
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-6 text-xs flex-1"
                                    onClick={() => criarNovoPedido(
                                      novoPedidoMode,
                                      novoPedidoMode === 'compra' && novoPedidoValor ? parseFloat(novoPedidoValor) : null,
                                    )}
                                    disabled={criandoPedido}
                                  >
                                    {criandoPedido ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => { setNovoPedidoMode(null); setNovoPedidoValor('') }}
                                  >
                                    Voltar
                                  </Button>
                                </div>
                              </div>
                            )}
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
              {etapaParaConfirmar !== null && (
                <div className="px-4 py-2 border-b bg-emerald-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-emerald-700 font-medium">
                    Marcar como {etapaParaConfirmar.nome} — Valor (opcional):
                  </span>
                  <input
                    id="valor-comprou-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="w-24 rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    onKeyDown={(e) => e.key === 'Enter' && atualizarJornada(etapaParaConfirmar, valorInput ? parseFloat(valorInput) : null)}
                  />
                  <Button
                    size="sm"
                    className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => atualizarJornada(etapaParaConfirmar, valorInput ? parseFloat(valorInput) : null)}
                    disabled={salvandoJornada}
                  >
                    {salvandoJornada ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => { setEtapaParaConfirmar(null); setValorInput('') }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Histórico de mensagens */}
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

      {/* ── Dialog de histórico de pedidos ──────────────────────────────────── */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de pedidos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido no histórico</p>
            ) : (
              historico.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.etapaNome ?? p.statusJornada}</p>
                    <p className="text-xs text-muted-foreground">{formatDataCompleta(p.createdAt)}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    p.etapaTipo === 'final_comprou' ? 'text-emerald-600' : 'text-muted-foreground',
                  )}>
                    {formatValor(p.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoricoOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}

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

// ─── Página principal exportada ───────────────────────────────────────────────

function MensagensPageInner() {
  const searchParams = useSearchParams()
  const telefone = searchParams.get('telefone')
  return <MensagensContent telefoneInicial={telefone} />
}

export default function MensagensPage() {
  return (
    <Suspense fallback={<MensagensContent telefoneInicial={null} />}>
      <MensagensPageInner />
    </Suspense>
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
