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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react'

interface Ciclo {
  id: string
  ativo: boolean
  intervaloDias: number
  quantidade?: number
  proximaNotificacao?: string
  ultimaCompra?: string
  cliente: { id: string; nome: string; telefone: string }
  produto: { id: string; nome: string }
}

interface Cliente { id: string; nome: string; telefone: string }
interface Produto { id: string; nome: string }

const emptyForm: { clienteId: string; produtoId: string; intervaloDias: string; quantidade: string } =
  { clienteId: '', produtoId: '', intervaloDias: '30', quantidade: '' }

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Ciclo | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    try {
      const [c, cl, pr] = await Promise.all([
        api.get('/ciclos'),
        api.get('/clientes'),
        api.get('/produtos'),
      ])
      setCiclos(c.data)
      setClientes(cl.data)
      setProdutos(pr.data)
    } catch {
      toast.error('Erro ao carregar dados')
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
      clienteId: ciclo.cliente.id,
      produtoId: ciclo.produto.id,
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo ciclo
          </Button>
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
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : ciclos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum ciclo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                ciclos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.cliente.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.cliente.telefone}</p>
                    </TableCell>
                    <TableCell>{c.produto.nome}</TableCell>
                    <TableCell>{c.intervaloDias}d</TableCell>
                    <TableCell>{c.quantidade ?? '—'}</TableCell>
                    <TableCell>{proximaBadge(c.proximaNotificacao)}</TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? 'default' : 'secondary'}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
    </LayoutShell>
  )
}
