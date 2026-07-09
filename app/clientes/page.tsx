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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  telefone: string
  email?: string
  ativo: boolean
  consentimentoWhatsapp: boolean
  origemLead?: string | null
}

const ORIGENS: Record<string, { label: string; className: string }> = {
  meta_ads:  { label: 'Meta Ads',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
  importado: { label: 'Importado',  className: 'bg-gray-100 text-gray-700 border-gray-200' },
}

function OrigemBadge({ origem }: { origem?: string | null }) {
  if (!origem) return <span className="text-muted-foreground text-xs">—</span>
  const cfg = ORIGENS[origem]
  if (cfg) {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 border-violet-200">
      {origem}
    </span>
  )
}

const empty = { nome: '', telefone: '', email: '', origemLead: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(empty)

  async function load() {
    try {
      const { data } = await api.get('/clientes')
      setClientes(data)
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditing(c)
    setForm({ nome: c.nome, telefone: c.telefone, email: c.email ?? '', origemLead: c.origemLead ?? '' })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nome || !form.telefone) return toast.error('Nome e telefone são obrigatórios')
    setSaving(true)
    const payload = {
      nome: form.nome,
      telefone: form.telefone,
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.origemLead.trim() ? { origemLead: form.origemLead.trim() } : {}),
    }
    try {
      if (editing) {
        await api.patch(`/clientes/${editing.id}`, payload)
        toast.success('Cliente atualizado')
      } else {
        await api.post('/clientes', { ...payload, consentimentoWhatsapp: true })
        toast.success('Cliente criado')
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
    if (!confirm('Remover este cliente?')) return
    try {
      await api.delete(`/clientes/${id}`)
      toast.success('Cliente removido')
      load()
    } catch {
      toast.error('Erro ao remover cliente')
    }
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">{clientes.length} cadastrados</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo cliente
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhum cliente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.telefone}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                    <TableCell><OrigemBadge origem={c.origemLead} /></TableCell>
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
            <DialogTitle>{editing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone * (ex: +5511999999999)</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Origem <span className="text-muted-foreground font-normal">(opcional — ex: meta_ads, loja_fisica)</span></Label>
              <Input value={form.origemLead} onChange={(e) => setForm({ ...form, origemLead: e.target.value })} />
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
