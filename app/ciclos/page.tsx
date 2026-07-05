'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Plus, Pencil, Trash2, Loader2, Calendar, Send, SendHorizonal,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react'

interface Ciclo {
  id: string
  ativo: boolean
  intervaloDias: number
  quantidade?: number
  proximaNotificacao?: string
  ultimaCompra?: string
  statusUltimoEnvio?: 'sucesso' | 'erro' | null
  clienteId: string
  clienteNome: string
  clienteTelefone: string
  produtoId: string
  produtoNome: string
}

interface Cliente { id: string; nome: string; telefone: string }
interface Produto { id: string; nome: string }

const emptyForm = { clienteId: '', produtoId: '', intervaloDias: '30', quantidade: '' }

function StatusEnvioIcon({ status }: { status?: string | null }) {
  if (status === 'sucesso') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'erro') return <XCircle className="h-4 w-4 text-red-500" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Ciclo | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [dispararOpen, setDispararOpen] = useState(false)
  const [dispararAll, setDispararAll] = useState(false)

  const vencidos = ciclos.filter(
    (c) => c.ativo && c.proximaNotificacao && new Date(c.proximaNotificacao) <= new Date(),
  )

  async function load() {
    try {
      const [resCiclos, resClientes, resProdutos] = await Promise.allSettled([
        api.get('/ciclos'),
        api.get('/clientes'),
        api.get('/produtos'),
      ])
      if (resCiclos.status === 'fulfilled') setCiclos(resCiclos.value.data)
      else toast.error('Erro ao carregar ciclos')
      if (resClientes.status === 'fulfilled') setClientes(resClientes.value.data)
      if (resProdutos.status === 'fulfilled') setProdutos(resProdutos.value.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(ciclo: Ciclo) {
    setEditing(ciclo)
    setForm({
      clienteId: ciclo.clienteId,
      produtoId: ciclo.produtoId,
      intervaloDias: String(ciclo.intervaloDias),
      quantidade: ciclo.quantidade != null ? String(ciclo.quantidade) : '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!editing && (!form.clienteId || !form.produtoId)) {
      return toast.error('Selecione cliente e produto')
    }
    if (!form.intervaloDias || parseInt(form.intervaloDias) < 1) {
      return toast.error('Intervalo deve ser pelo menos 1 dia')
    }
    setSaving(true)
    try {
      const payload: any = {
        intervaloDias: parseInt(form.intervaloDias),
        quantidade: form.quantidade ? parseFloat(form.quantidade) : undefined,
      }
      if (!editing) {
        payload.clienteId = form.clienteId
        payload.produtoId = form.produtoId
        await api.post('/ciclos', payload)
        toast.success('Ciclo criado')
      } else {
        await api.patch(`/ciclos/${editing.id}`, payload)
        toast.success('Ciclo atualizado')
      }
      setOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Desativar e remover este ciclo?')) return
    try {
      await api.delete(`/ciclos/${id}`)
      toast.success('Ciclo removido')
      load()
    } catch {
      toast.error('Erro ao remover ciclo')
    }
  }

  async function handleEnviarAgora(ciclo: Ciclo) {
    setSendingId(ciclo.id)
    try {
      await api.post(`/ciclos/${ciclo.id}/enviar-lembrete`)
      toast.success(`Lembrete enviado para ${ciclo.clienteNome}`)
      setCiclos((prev) =>
        prev.map((c) => c.id === ciclo.id ? { ...c, statusUltimoEnvio: 'sucesso' } : c),
      )
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao enviar lembrete'
      toast.error(msg)
      setCiclos((prev) =>
        prev.map((c) => c.id === ciclo.id ? { ...c, statusUltimoEnvio: 'erro' } : c),
      )
    } finally {
      setSendingId(null)
    }
  }

  async function handleDispararTodos() {
    setDispararAll(true)
    try {
      const res = await api.post('/ciclos/disparar-todos')
      toast.success(res.data.mensagem || `${res.data.total} lembretes em disparo`)
      setDispararOpen(false)
      setTimeout(load, 1000)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao disparar lembretes')
    } finally {
      setDispararAll(false)
    }
  }

  function formatDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  function proximaBadge(data?: string) {
    if (!data) return <span className="text-muted-foreground">—</span>
    const diff = Math.ceil((new Date(data).getTime() - Date.now()) / 86400000)
    if (diff < 0) return <Badge variant="destructive">Vencido</Badge>
    if (diff === 0) return <Badge variant="destructive">Hoje</Badge>
    if (diff <= 3) return <Badge variant="outline" className="border-orange-400 text-orange-500">Em {diff}d</Badge>
    return <span className="text-sm">{formatDate(data)}</span>
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ciclos de Recompra</h1>
            <p className="text-sm text-muted-foreground mt-1">{ciclos.length} ciclos ativos</p>
          </div>
          <div className="flex gap-2">
            {vencidos.length > 0 && (
              <Button variant="outline" onClick={() => setDispararOpen(true)}>
                <SendHorizonal className="h-4 w-4 mr-2" />
                Disparar todos ({vencidos.length})
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo ciclo
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Qtde.</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Próx. lembrete</span>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último envio</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : ciclos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum ciclo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                ciclos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{c.clienteTelefone}</p>
                    </TableCell>
                    <TableCell>{c.produtoNome}</TableCell>
                    <TableCell>{c.intervaloDias}d</TableCell>
                    <TableCell>{c.quantidade ?? '—'}</TableCell>
                    <TableCell>{proximaBadge(c.proximaNotificacao)}</TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <StatusEnvioIcon status={c.statusUltimoEnvio} />
                        <span className="text-xs text-muted-foreground">
                          {c.statusUltimoEnvio === 'sucesso' ? 'Enviado'
                            : c.statusUltimoEnvio === 'erro' ? 'Erro'
                            : 'Pendente'}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnviarAgora(c)}
                          disabled={sendingId === c.id}
                          title="Enviar lembrete agora"
                        >
                          {sendingId === c.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Send className="h-3.5 w-3.5" />}
                          <span className="ml-1 text-xs">Enviar</span>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal: novo / editar ciclo */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ciclo' : 'Novo ciclo de recompra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Cliente *</Label>
                  <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v ?? '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} — {c.telefone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Produto *</Label>
                  <Select value={form.produtoId} onValueChange={(v) => setForm({ ...form, produtoId: v ?? '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intervalo (dias) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.intervaloDias}
                  onChange={(e) => setForm({ ...form, intervaloDias: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: disparar todos */}
      <Dialog open={dispararOpen} onOpenChange={setDispararOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disparar lembretes em massa</DialogTitle>
            <DialogDescription>
              {vencidos.length === 0
                ? 'Nenhum ciclo vencido no momento.'
                : `${vencidos.length} ciclo${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} receberá${vencidos.length > 1 ? 'ão' : ''} um lembrete agora.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            As mensagens são enviadas com <strong>5 segundos de intervalo</strong> entre cada uma para evitar bloqueio do WhatsApp.
            O processo roda em segundo plano — você pode fechar esta janela.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispararOpen(false)}>Cancelar</Button>
            <Button onClick={handleDispararTodos} disabled={dispararAll || vencidos.length === 0}>
              {dispararAll
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disparando...</>
                : <><SendHorizonal className="mr-2 h-4 w-4" />Disparar {vencidos.length} lembrete{vencidos.length !== 1 ? 's' : ''}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
