'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Wifi, WifiOff, RefreshCw, MessageSquare } from 'lucide-react'

type Status = 'conectado' | 'desconectado' | 'aguardando'

const TEMPLATE_PADRAO =
  `Oi, {nome}! 👋\n\nJá está na hora de repor *{produto}*{quantidade}. Posso te ajudar?\n\nResponda:\n1️⃣ *1* — Quero pedir\n2️⃣ *2* — Me avise depois\n3️⃣ *3* — Não quero mais`

const QR_REFRESH_MS = 14_000

function aplicarVariaveis(template: string) {
  return template
    .replace(/\{nome\}/g, 'Maria')
    .replace(/\{produto\}/g, 'Ração Golden')
    .replace(/\{quantidade\}/g, ' (2 kg)')
    .replace(/\{loja\}/g, 'BeeUp Pizzarias')
}

export default function ConfiguracoesPage() {
  const [status, setStatus] = useState<Status>('desconectado')
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [modelo, setModelo] = useState(TEMPLATE_PADRAO)
  const [modeloOriginal, setModeloOriginal] = useState(TEMPLATE_PADRAO)
  const [savingModelo, setSavingModelo] = useState(false)
  const [loadingModelo, setLoadingModelo] = useState(true)

  const modeloAlterado = modelo !== modeloOriginal

  // ── Carrega configurações da loja ─────────────────────────────────
  useEffect(() => {
    api.get('/lojas/minha')
      .then(({ data }) => {
        const t = data.modeloMensagem || TEMPLATE_PADRAO
        setModelo(t)
        setModeloOriginal(t)
      })
      .catch(() => { /* usa o default */ })
      .finally(() => setLoadingModelo(false))
  }, [])

  async function salvarModelo() {
    setSavingModelo(true)
    try {
      await api.patch('/lojas/minha/modelo-mensagem', { modeloMensagem: modelo })
      setModeloOriginal(modelo)
      toast.success('Modelo salvo com sucesso')
    } catch {
      toast.error('Erro ao salvar modelo')
    } finally {
      setSavingModelo(false)
    }
  }

  function restaurarPadrao() {
    setModelo(TEMPLATE_PADRAO)
  }

  // ── WhatsApp QR Code ──────────────────────────────────────────────
  function pararPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const buscarQrCode = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/qrcode')
      const novoStatus: Status = data.status ?? 'desconectado'
      setStatus(novoStatus)
      if (data.qrcode) setQrValue(data.qrcode)
      if (novoStatus === 'conectado') {
        setQrValue(null)
        pararPolling()
        toast.success('WhatsApp conectado!')
      }
    } catch { /* tentará no próximo tick */ }
  }, [])

  async function iniciarConexao() {
    setLoadingQr(true)
    pararPolling()
    setQrValue(null)
    await buscarQrCode()
    setLoadingQr(false)
    intervalRef.current = setInterval(buscarQrCode, QR_REFRESH_MS)
  }

  async function desconectar() {
    setDesconectando(true)
    pararPolling()
    try {
      await api.post('/whatsapp/desconectar')
      setStatus('desconectado')
      setQrValue(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setDesconectando(false)
    }
  }

  useEffect(() => {
    buscarQrCode()
    return () => pararPolling()
  }, [buscarQrCode])

  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações da sua conta</p>
        </div>

        {/* ── Conexão WhatsApp ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Conexão WhatsApp</CardTitle>
                <CardDescription className="mt-1">
                  Escaneie o QR Code com seu WhatsApp para conectar a conta ao RecompraZap.
                </CardDescription>
              </div>
              <StatusBadge status={status} />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {status === 'conectado' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Wifi className="h-8 w-8" />
                  <span className="text-lg font-medium">WhatsApp conectado</span>
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Seu WhatsApp está ativo e enviando mensagens pelo RecompraZap.
                </p>
                <Button
                  variant="destructive"
                  onClick={desconectar}
                  disabled={desconectando}
                  className="mt-2"
                >
                  {desconectando
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Desconectando…</>
                    : <><WifiOff className="h-4 w-4 mr-2" /> Desconectar WhatsApp</>
                  }
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  {loadingQr || (status === 'aguardando' && !qrValue) ? (
                    <div className="flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : qrValue ? (
                    <QRCodeSVG value={qrValue} size={200} level="M" />
                  ) : (
                    <div
                      className="flex items-center justify-center text-center text-sm text-muted-foreground px-4"
                      style={{ width: 200, height: 200 }}
                    >
                      Clique em &ldquo;Gerar QR Code&rdquo; para iniciar
                    </div>
                  )}
                </div>

                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside text-left w-full max-w-xs">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em <strong>Dispositivos conectados</strong></li>
                  <li>Toque em <strong>Conectar dispositivo</strong></li>
                  <li>Aponte a câmera para o QR Code acima</li>
                </ol>

                {status === 'aguardando' && qrValue && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 w-full max-w-xs text-center">
                    Aguardando escaneamento… O QR atualiza automaticamente.
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={iniciarConexao}
                  disabled={loadingQr}
                  className="w-full max-w-xs"
                >
                  {loadingQr
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…</>
                    : <><RefreshCw className="h-4 w-4 mr-2" /> Gerar QR Code</>
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Modelo de mensagem ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <CardTitle>Modelo de mensagem</CardTitle>
                <CardDescription className="mt-1">
                  Personalize o texto enviado aos clientes nos lembretes de recompra.
                  Use <code className="text-xs bg-muted px-1 rounded">{'{nome}'}</code>,{' '}
                  <code className="text-xs bg-muted px-1 rounded">{'{produto}'}</code>,{' '}
                  <code className="text-xs bg-muted px-1 rounded">{'{quantidade}'}</code> e{' '}
                  <code className="text-xs bg-muted px-1 rounded">{'{loja}'}</code> como variáveis.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadingModelo ? (
              <div className="h-32 rounded-md border bg-muted animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Editor */}
                <div className="space-y-2">
                  <Label>Template</Label>
                  <textarea
                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder={TEMPLATE_PADRAO}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="min-h-[200px] rounded-md border bg-[#e5ddd5] p-3">
                    <div className="max-w-[85%] ml-auto bg-[#dcf8c6] rounded-lg px-3 py-2 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-gray-800">
                        {aplicarVariaveis(modelo || TEMPLATE_PADRAO)}
                      </p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">agora ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={restaurarPadrao}
                disabled={modelo === TEMPLATE_PADRAO || savingModelo}
              >
                Restaurar padrão
              </Button>
              <Button
                onClick={salvarModelo}
                disabled={!modeloAlterado || savingModelo}
              >
                {savingModelo
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</>
                  : 'Salvar modelo'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'conectado') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Conectado
      </Badge>
    )
  }
  if (status === 'aguardando') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Aguardando
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1.5 flex-shrink-0">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      Desconectado
    </Badge>
  )
}
