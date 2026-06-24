'use client'

import { useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react'

type Status = 'conectado' | 'desconectado' | 'aguardando'

const QR_PLACEHOLDER = 'https://recomprazap.com.br/whatsapp/connect'

export default function ConfiguracoesPage() {
  const [status, setStatus] = useState<Status>('desconectado')
  const [qrValue, setQrValue] = useState(QR_PLACEHOLDER)
  const [loadingQr, setLoadingQr] = useState(false)
  const [desconectando, setDesconectando] = useState(false)

  async function atualizarQr() {
    setLoadingQr(true)
    try {
      const { data } = await api.get('/whatsapp/qrcode')
      setQrValue(data.qrcode ?? data.value ?? QR_PLACEHOLDER)
      setStatus('aguardando')
    } catch {
      toast.error('Erro ao buscar QR Code')
    } finally {
      setLoadingQr(false)
    }
  }

  async function desconectar() {
    setDesconectando(true)
    try {
      await api.post('/whatsapp/desconectar')
      setStatus('desconectado')
      setQrValue(QR_PLACEHOLDER)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setDesconectando(false)
    }
  }

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
                {/* QR Code */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  {loadingQr ? (
                    <div className="flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <QRCodeSVG
                      value={qrValue}
                      size={200}
                      level="M"
                    />
                  )}
                </div>

                {/* Instruções */}
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside text-left w-full max-w-xs">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em <strong>Dispositivos conectados</strong></li>
                  <li>Toque em <strong>Conectar dispositivo</strong></li>
                  <li>Aponte a câmera para o QR Code acima</li>
                </ol>

                {status === 'aguardando' && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 w-full max-w-xs text-center">
                    Aguardando escaneamento…
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={atualizarQr}
                  disabled={loadingQr}
                  className="w-full max-w-xs"
                >
                  {loadingQr
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…</>
                    : <><RefreshCw className="h-4 w-4 mr-2" /> Gerar novo QR Code</>
                  }
                </Button>
              </div>
            )}
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
