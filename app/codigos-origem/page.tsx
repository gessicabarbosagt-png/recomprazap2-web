'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'

interface Codigo {
  id: string
  codigo: string
  rotulo: string
  createdAt: string
}

const empty = { codigo: '', rotulo: '' }

export default function CodigosOrigemPage() {
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Codigo | null>(null)
  const [form, setForm] = useState(empty)

  async function load() {
    try {
      const { data } = await api.get('/codigos-origem')
      setCodigos(data)
    } catch {
      toast.error('Erro ao carregar códigos')
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

  function openEdit(c: Codigo) {
    setEditing(c)
    setForm({ codigo: c.codigo, rotulo: c.rotulo })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.codigo.trim() || !form.rotulo.trim()) {
      return toast.error('Código e rótulo são obrigatórios')
    }
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/codigos-origem/${editing.id}`, form)
        toast.success('Código atualizado')
      } else {
        await api.post('/codigos-origem', form)
        toast.success('Código criado')
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
    if (!confirm('Remover este código?')) return
    try {
      await api.delete(`/codigos-origem/${id}`)
      toast.success('Código removido')
      load()
    } catch {
      toast.error('Erro ao remover código')
    }
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Origem de Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Códigos de rastreio detectados na primeira mensagem dos clientes (ex: #google → Google Ads).
              Quando um cliente novo envia uma mensagem contendo <strong>#codigo</strong>, a origem é registrada automaticamente.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo código
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código (use #código na msg)</TableHead>
                <TableHead>Rótulo (exibido no painel)</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : codigos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Tag className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Nenhum código cadastrado</p>
                      <p className="text-xs">Crie um código como &quot;google&quot; e peça aos clientes para enviarem #google</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                codigos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-violet-700">#{c.codigo}</span>
                    </TableCell>
                    <TableCell className="text-sm">{c.rotulo}</TableCell>
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
            <DialogTitle>{editing ? 'Editar código' : 'Novo código de rastreio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Código * <span className="text-muted-foreground font-normal">(sem #, ex: google)</span></Label>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">#</span>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                  placeholder="google"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rótulo * <span className="text-muted-foreground font-normal">(exibido no painel)</span></Label>
              <Input
                value={form.rotulo}
                onChange={(e) => setForm({ ...form, rotulo: e.target.value })}
                placeholder="Google Ads"
              />
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
