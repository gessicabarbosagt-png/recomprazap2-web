'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Send, MessageSquare, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Mensagem {
  id: string
  telefone: string
  clienteNome?: string
  conteudo: string
  direcao: 'recebida' | 'enviada'
  tipo?: 'lembrete' | 'manual'
  lida?: boolean
  criadoEm: string
}

interface Conversa {
  telefone: string
  clienteNome: string
  ultimaMensagem: string
  ultimaData: string
  naoLidas: number
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
  const [texto, setTexto] = useState('')
  const [statusWA, setStatusWA] = useState<StatusWA>('desconectado')
  const [atualizando, setAtualizando] = useState(false)

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

  // Ao trocar de conversa: sempre vai para o fundo
  useEffect(() => {
    if (conversaAtiva !== conversaAtivaRef.current) {
      conversaAtivaRef.current = conversaAtiva
      setTimeout(() => scrollToBottom(true), 0)
    }
  }, [conversaAtiva])

  // Ao chegarem novas mensagens: só rola se já estava no fundo
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
          clienteNome: sorted[0].clienteNome ?? telefone,
          ultimaMensagem: sorted[0].conteudo,
          ultimaData: sorted[0].criadoEm,
          naoLidas: msgs.filter((m) => m.direcao === 'recebida' && !m.lida).length,
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
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {conversaAtivaInfo.clienteNome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{conversaAtivaInfo.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{conversaAtiva}</p>
                </div>
              </div>

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
