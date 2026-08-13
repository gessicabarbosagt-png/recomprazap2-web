'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LayoutShell } from '@/components/app/layout-shell'
import { AdminGuard } from '@/components/app/admin-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { ArrowLeft, WifiOff, WifiIcon, KeyRound, Power, CreditCard, QrCode, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

interface LojaDetalhe {
  id: string
  nome: string
  email: string
  slug: string
  ativa: boolean
  plano: string
  statusAssinatura: string
  valorMensalidade: number | null
  proximoVencimento: string | null
  waStatus: string
  waAtualizadoEm: string | null
  createdAt: string
  usuarios: Usuario[]
}

interface SenhaReset {
  usuarioNome: string
  senhaTemporaria: string
}

interface PagamentoAdmin {
  id: string
  tipo: 'card' | 'pix'
  valor: string
  status: string
  descricao: string | null
  mpPaymentId: string | null
  criadoEm: string
}

const PAGTO_STATUS_ADMIN: Record<string, { label: string; icon: React.ReactNode }> = {
  aprovado: { label: 'Aprovado',  icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> },
  pendente: { label: 'Pendente',  icon: <Clock        className="h-3.5 w-3.5 text-amber-500" /> },
  recusado: { label: 'Recusado',  icon: <XCircle      className="h-3.5 w-3.5 text-destructive" /> },
  cancelado:{ label: 'Cancelado', icon: <XCircle      className="h-3.5 w-3.5 text-muted-foreground" /> },
}

function dist(d: string | null) {
  if (!d) return 'nunca'
  return formatDistanceToNow(new Date(d), { locale: ptBR, addSuffix: true })
}

export default function LojaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [loja, setLoja] = useState<LojaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [resetSenha, setResetSenha] = useState<SenhaReset | null>(null)
  const [pagamentos, setPagamentos] = useState<PagamentoAdmin[]>([])

  const [form, setForm] = useState({
    plano: '',
    statusAssinatura: '',
    valorMensalidade: '',
    proximoVencimento: '',
  })

  function carregarLoja() {
    Promise.all([
      api.get(`/admin/lojas/${id}`),
      api.get(`/admin/lojas/${id}/pagamentos`).catch(() => ({ data: [] })),
    ]).then(([lojaRes, pagtosRes]) => {
      setLoja(lojaRes.data)
      setPagamentos(pagtosRes.data)
      setForm({
        plano: lojaRes.data.plano ?? '',
        statusAssinatura: lojaRes.data.statusAssinatura ?? 'ativa',
        valorMensalidade: lojaRes.data.valorMensalidade != null ? String(lojaRes.data.valorMensalidade) : '',
        proximoVencimento: lojaRes.data.proximoVencimento
          ? format(new Date(lojaRes.data.proximoVencimento), 'yyyy-MM-dd')
          : '',
      })
    }).finally(() => setLoading(false))
  }

  useEffect(() => { carregarLoja() }, [id])

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch(`/admin/lojas/${id}`, {
        plano: form.plano || undefined,
        statusAssinatura: form.statusAssinatura || undefined,
        valorMensalidade: form.valorMensalidade ? Number(form.valorMensalidade) : null,
        proximoVencimento: form.proximoVencimento || null,
      })
      toast.success('Assinatura atualizada')
      carregarLoja()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivacao() {
    if (!loja) return
    const acao = loja.ativa ? 'desativar' : 'ativar'
    if (!confirm(`Tem certeza que deseja ${acao} a loja "${loja.nome}"?`)) return
    try {
      await api.patch(`/admin/lojas/${id}/ativar`, { ativa: !loja.ativa })
      toast.success(`Loja ${acao === 'ativar' ? 'ativada' : 'desativada'}`)
      carregarLoja()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro')
    }
  }

  async function resetarSenhaUsuario(usuario: Usuario) {
    if (!confirm(`Resetar a senha de ${usuario.nome}?`)) return
    try {
      const { data } = await api.post(`/admin/lojas/${id}/usuarios/${usuario.id}/resetar-senha`)
      setResetSenha({ usuarioNome: usuario.nome, senhaTemporaria: data.senhaTemporaria })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao resetar senha')
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <LayoutShell>
          <Skeleton className="h-96 w-full max-w-3xl" />
        </LayoutShell>
      </AdminGuard>
    )
  }

  if (!loja) return null

  return (
    <AdminGuard>
      <LayoutShell>
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center gap-3">
            <Link href="/admin/lojas">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Lojas
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold">{loja.nome}</h1>
            {!loja.ativa && <Badge variant="outline">Inativa</Badge>}
          </div>

          {/* Senha resetada */}
          {resetSenha && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40">
              <CardContent className="pt-4 space-y-1 text-sm font-mono text-green-900 dark:text-green-300">
                <p>Usuário: <strong>{resetSenha.usuarioNome}</strong></p>
                <p>Nova senha temporária: <strong>{resetSenha.senhaTemporaria}</strong></p>
                <Button variant="ghost" size="sm" className="mt-1 text-green-700 dark:text-green-400" onClick={() => setResetSenha(null)}>Fechar</Button>
              </CardContent>
            </Card>
          )}

          {/* Dados da loja */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{loja.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{loja.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastrada em</span>
                <span>{format(new Date(loja.createdAt), 'd MMM yyyy', { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">WhatsApp</span>
                <div className="flex items-center gap-1.5">
                  {loja.waStatus === 'conectado'
                    ? <WifiIcon className="h-3.5 w-3.5 text-green-600" />
                    : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                  <span className={loja.waStatus === 'conectado' ? 'text-green-700' : 'text-destructive'}>
                    {loja.waStatus === 'conectado' ? 'Conectado' : 'Desconectado'}
                  </span>
                  {loja.waAtualizadoEm && (
                    <span className="text-muted-foreground text-xs">· {dist(loja.waAtualizadoEm)}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Plano</Label>
                  <Input
                    value={form.plano}
                    onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}
                    placeholder="ex: mensal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={form.statusAssinatura}
                    onValueChange={v => setForm(f => ({ ...f, statusAssinatura: v ?? 'ativa' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inadimplente">Inadimplente</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor mensalidade (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valorMensalidade}
                    onChange={e => setForm(f => ({ ...f, valorMensalidade: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Próximo vencimento</Label>
                  <Input
                    type="date"
                    value={form.proximoVencimento}
                    onChange={e => setForm(f => ({ ...f, proximoVencimento: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={salvar} disabled={salvando} size="sm">
                {salvando ? 'Salvando...' : 'Salvar assinatura'}
              </Button>
            </CardContent>
          </Card>

          {/* Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuários da loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loja.usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.perfil}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetarSenhaUsuario(u)}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Resetar senha
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Histórico de pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento registrado.</p>
              ) : (
                <div className="divide-y text-sm">
                  {pagamentos.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        {p.tipo === 'card'
                          ? <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          : <QrCode     className="h-3.5 w-3.5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">R$ {Number(p.valor).toFixed(2).replace('.', ',')}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.descricao ?? p.tipo} · {format(new Date(p.criadoEm), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {PAGTO_STATUS_ADMIN[p.status]?.icon}
                        <span className="text-muted-foreground">{PAGTO_STATUS_ADMIN[p.status]?.label ?? p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zona de perigo */}
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{loja.ativa ? 'Desativar loja' : 'Ativar loja'}</p>
                  <p className="text-xs text-muted-foreground">
                    {loja.ativa
                      ? 'Lojista não conseguirá mais fazer login e lembretes não serão enviados.'
                      : 'Reativa o acesso e os lembretes da loja.'}
                  </p>
                </div>
                <Button
                  variant={loja.ativa ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={alternarAtivacao}
                >
                  <Power className="h-3.5 w-3.5 mr-1.5" />
                  {loja.ativa ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </LayoutShell>
    </AdminGuard>
  )
}
