'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { AdminGuard } from '@/components/app/admin-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { Plus, WifiOff, WifiIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface Loja {
  id: string
  nome: string
  email: string
  ativa: boolean
  statusAssinatura: string
  waStatus: string
  waAtualizadoEm: string | null
  lembretes7d: number
  ultimaAtividade: string | null
}

interface Credenciais {
  loja: { nome: string; email: string }
  usuario: { nome: string; email: string }
  senhaTemporaria: string
}

const STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  inadimplente: 'Inadimplente',
  cancelada: 'Cancelada',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ativa: 'default',
  inadimplente: 'secondary',
  cancelada: 'destructive',
}

function dist(d: string | null) {
  if (!d) return '—'
  return formatDistanceToNow(new Date(d), { locale: ptBR, addSuffix: true })
}

export default function AdminLojasPage() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null)
  const [form, setForm] = useState({ lojaNome: '', lojaEmail: '', usuarioNome: '', usuarioEmail: '' })

  function carregarLojas() {
    setLoading(true)
    api.get('/admin/lojas').then(r => setLojas(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { carregarLojas() }, [])

  async function criarLoja(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true)
    try {
      const { data } = await api.post('/admin/lojas', form)
      setCredenciais(data)
      setForm({ lojaNome: '', lojaEmail: '', usuarioNome: '', usuarioEmail: '' })
      setDialogAberto(false)
      carregarLojas()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar loja')
    } finally {
      setCriando(false)
    }
  }

  return (
    <AdminGuard>
      <LayoutShell>
        <div className="space-y-6 max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Lojas</h1>
              <p className="text-sm text-muted-foreground mt-1">{lojas.length} loja{lojas.length !== 1 ? 's' : ''} cadastrada{lojas.length !== 1 ? 's' : ''}</p>
            </div>
            <Button onClick={() => setDialogAberto(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova loja
            </Button>
          </div>

          {/* Credenciais da loja criada */}
          {credenciais && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800">Loja criada! Copie as credenciais antes de sair.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm font-mono text-green-900">
                <p>Loja: <strong>{credenciais.loja.nome}</strong></p>
                <p>Login: <strong>{credenciais.usuario.email}</strong></p>
                <p>Senha temporária: <strong>{credenciais.senhaTemporaria}</strong></p>
                <Button variant="ghost" size="sm" className="mt-2 text-green-700" onClick={() => setCredenciais(null)}>
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tabela de lojas */}
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : lojas.map(loja => (
              <Link key={loja.id} href={`/admin/lojas/${loja.id}`}>
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{loja.nome}</p>
                        {!loja.ativa && <Badge variant="outline" className="text-xs">Inativa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{loja.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-muted-foreground">{loja.lembretes7d} lembretes / 7d</p>
                      <p className="text-xs text-muted-foreground">última ativ. {dist(loja.ultimaAtividade)}</p>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {loja.waStatus === 'conectado' ? (
                        <WifiIcon className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={loja.waStatus === 'conectado' ? 'text-green-700' : 'text-destructive'}>
                        {loja.waStatus === 'conectado' ? 'online' : 'offline'}
                      </span>
                    </div>

                    <Badge variant={STATUS_VARIANT[loja.statusAssinatura] ?? 'outline'}>
                      {STATUS_LABEL[loja.statusAssinatura] ?? loja.statusAssinatura}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Dialog: criar loja */}
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova loja</DialogTitle>
            </DialogHeader>
            <form onSubmit={criarLoja} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Nome da loja</Label>
                <Input
                  value={form.lojaNome}
                  onChange={e => setForm(f => ({ ...f, lojaNome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email da loja</Label>
                <Input
                  type="email"
                  value={form.lojaEmail}
                  onChange={e => setForm(f => ({ ...f, lojaEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Nome do lojista</Label>
                <Input
                  value={form.usuarioNome}
                  onChange={e => setForm(f => ({ ...f, usuarioNome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email do lojista (login)</Label>
                <Input
                  type="email"
                  value={form.usuarioEmail}
                  onChange={e => setForm(f => ({ ...f, usuarioEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button type="submit" disabled={criando}>
                  {criando ? 'Criando...' : 'Criar loja'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </LayoutShell>
    </AdminGuard>
  )
}
