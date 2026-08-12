'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Wifi, WifiOff, RefreshCw, Eye, User, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'conectado' | 'desconectado' | 'aguardando'
type Aba = 'whatsapp' | 'perfil'

const QR_REFRESH_MS = 14_000

export default function ConfiguracoesPage() {
  const { usuario, login, token } = useAuth()
  const [aba, setAba] = useState<Aba>('whatsapp')

  // ── WhatsApp ───────────────────────────────────────────────────────
  const [status, setStatus] = useState<Status>('desconectado')
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Configuração de inbox ──────────────────────────────────────────
  const [confirmarLeituraWa, setConfirmarLeituraWa] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  // ── Perfil ─────────────────────────────────────────────────────────
  const [nomeUsuario, setNomeUsuario] = useState(usuario?.nome ?? '')
  const [nomeLoja, setNomeLoja] = useState(usuario?.loja?.nome ?? '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const [novoEmail, setNovoEmail] = useState('')
  const [senhaEmail, setSenhaEmail] = useState('')
  const [salvandoEmail, setSalvandoEmail] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const [excluirDialog, setExcluirDialog] = useState(false)
  const [nomeConfirm, setNomeConfirm] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    if (usuario) {
      setNomeUsuario(usuario.nome)
      setNomeLoja(usuario.loja?.nome ?? '')
    }
  }, [usuario])

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

  const buscarConfigLoja = useCallback(async () => {
    try {
      const { data } = await api.get('/lojas/minha')
      setConfirmarLeituraWa(data.confirmarLeituraWa ?? false)
    } catch { /* silencioso */ }
  }, [])

  async function toggleConfirmarLeitura() {
    const novo = !confirmarLeituraWa
    setConfirmarLeituraWa(novo)
    setSalvandoConfig(true)
    try {
      await api.patch('/lojas/minha/configuracao', { confirmarLeituraWa: novo })
    } catch {
      setConfirmarLeituraWa(!novo)
      toast.error('Erro ao salvar configuração')
    } finally {
      setSalvandoConfig(false)
    }
  }

  useEffect(() => {
    buscarQrCode()
    buscarConfigLoja()
    return () => pararPolling()
  }, [buscarQrCode, buscarConfigLoja])

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoPerfil(true)
    try {
      const { data } = await api.patch('/lojas/minha/perfil', { nomeUsuario, nomeLoja })
      if (usuario && token) {
        login(token, {
          ...usuario,
          nome: data.nomeUsuario ?? nomeUsuario,
          loja: usuario.loja ? { ...usuario.loja, nome: data.nomeLoja ?? nomeLoja } : null,
        })
      }
      toast.success('Perfil atualizado')
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSalvandoPerfil(false)
    }
  }

  async function salvarEmail(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoEmail(true)
    try {
      await api.patch('/lojas/minha/alterar-email', { novoEmail, senhaAtual: senhaEmail })
      if (usuario && token) {
        login(token, { ...usuario, email: novoEmail })
      }
      toast.success('E-mail atualizado')
      setNovoEmail('')
      setSenhaEmail('')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar e-mail')
    } finally {
      setSalvandoEmail(false)
    }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }
    setSalvandoSenha(true)
    try {
      await api.patch('/lojas/minha/alterar-senha', { senhaAtual, novaSenha })
      toast.success('Senha alterada com sucesso')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao alterar senha')
    } finally {
      setSalvandoSenha(false)
    }
  }

  async function excluirConta() {
    setExcluindo(true)
    try {
      await api.delete('/lojas/minha', { data: { nomeLoja: nomeConfirm } })
      toast.success('Conta encerrada')
      window.location.href = '/login'
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao excluir conta')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações da sua conta</p>
        </div>

        {/* Abas */}
        <div className="flex gap-1 border-b">
          {([['whatsapp', 'WhatsApp'], ['perfil', 'Perfil']] as [Aba, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                aba === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {aba === 'perfil' && (
          <div className="space-y-6">
            {/* Dados básicos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Dados do perfil</CardTitle>
                </div>
                <CardDescription>Atualize seu nome e o nome da loja.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={salvarPerfil} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Seu nome</Label>
                    <Input value={nomeUsuario} onChange={e => setNomeUsuario(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Nome da loja</Label>
                    <Input value={nomeLoja} onChange={e => setNomeLoja(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={salvandoPerfil}>
                    {salvandoPerfil ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : 'Salvar'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Alterar e-mail */}
            <Card>
              <CardHeader>
                <CardTitle>Alterar e-mail de login</CardTitle>
                <CardDescription>E-mail atual: <strong>{usuario?.email}</strong></CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={salvarEmail} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Novo e-mail</Label>
                    <Input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Senha atual (para confirmar)</Label>
                    <Input type="password" value={senhaEmail} onChange={e => setSenhaEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={salvandoEmail}>
                    {salvandoEmail ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : 'Atualizar e-mail'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Alterar senha */}
            <Card>
              <CardHeader>
                <CardTitle>Alterar senha</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={salvarSenha} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Senha atual</Label>
                    <Input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Nova senha</Label>
                    <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Confirmar nova senha</Label>
                    <Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={salvandoSenha}>
                    {salvandoSenha ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : 'Alterar senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Zona de perigo */}
            <div>
              <Separator className="mb-6" />
              <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="font-semibold text-sm">Zona de perigo</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Encerrar a conta desativa permanentemente sua loja e impede futuros logins. Os dados não são apagados,
                  mas você não poderá mais acessar o painel. Esta ação é irreversível.
                </p>
                <Button variant="destructive" size="sm" onClick={() => setExcluirDialog(true)}>
                  Excluir conta
                </Button>
              </div>
            </div>
          </div>
        )}

        {aba === 'whatsapp' && (
        <div className="space-y-8">

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

        {/* ── Comportamento do inbox ───────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <CardTitle>Comportamento do inbox</CardTitle>
                <CardDescription className="mt-1">
                  Configure como o painel interage com as conversas do WhatsApp.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enviar confirmação de leitura ao abrir conversa</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Quando ativado, seus clientes verão o ✓✓ azul ao abrir a conversa no painel.
                  Por padrão, as mensagens são marcadas como lidas internamente sem notificar o cliente.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={confirmarLeituraWa}
                disabled={salvandoConfig}
                onClick={toggleConfirmarLeitura}
                className={cn(
                  'relative flex-shrink-0 h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  confirmarLeituraWa ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    confirmarLeituraWa ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        </div>
        )}

      </div>

      {/* Dialog: confirmar exclusão de conta */}
      <Dialog open={excluirDialog} onOpenChange={setExcluirDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Excluir conta
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Sua loja será desativada e você não poderá mais fazer login.
              Para confirmar, digite o nome exato da loja abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Nome da loja para confirmar</Label>
              <Input
                value={nomeConfirm}
                onChange={e => setNomeConfirm(e.target.value)}
                placeholder={usuario?.loja?.nome ?? ''}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setExcluirDialog(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={excluirConta}
                disabled={excluindo || nomeConfirm.trim().toLowerCase() !== (usuario?.loja?.nome ?? '').trim().toLowerCase()}
              >
                {excluindo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Encerrando…</> : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
