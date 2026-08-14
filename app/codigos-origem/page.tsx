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
import { Plus, Pencil, Trash2, Loader2, Link2, Copy, MousePointerClick } from 'lucide-react'

interface LinkOrigem {
  id: string
  slug: string
  rotulo: string
  mensagemPrefixo: string
  cliquesTotal: number
  criadoEm: string
}

const WEB_BASE = 'https://recomprazap2-web.vercel.app'
const emptyLink = { rotulo: '', mensagemPrefixo: '', codigoParaEmbutir: '' }

export default function CodigosOrigemPage() {
  const [links, setLinks] = useState<LinkOrigem[]>([])
  const [loading, setLoading] = useState(true)
  const [linkOpen, setLinkOpen] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkOrigem | null>(null)
  const [linkForm, setLinkForm] = useState(emptyLink)

  async function loadLinks() {
    try {
      const { data } = await api.get('/links-origem')
      setLinks(data)
    } catch {
      toast.error('Erro ao carregar links')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLinks() }, [])

  function openCreateLink() {
    setEditingLink(null)
    setLinkForm(emptyLink)
    setLinkOpen(true)
  }

  function openEditLink(l: LinkOrigem) {
    setEditingLink(l)
    setLinkForm({ rotulo: l.rotulo, mensagemPrefixo: l.mensagemPrefixo, codigoParaEmbutir: '' })
    setLinkOpen(true)
  }

  async function handleSaveLink() {
    if (!linkForm.rotulo.trim()) return toast.error('Rótulo é obrigatório')
    setSavingLink(true)
    try {
      if (editingLink) {
        await api.patch(`/links-origem/${editingLink.id}`, {
          rotulo: linkForm.rotulo,
          mensagemPrefixo: linkForm.mensagemPrefixo || undefined,
        })
        toast.success('Link atualizado')
      } else {
        await api.post('/links-origem', {
          rotulo: linkForm.rotulo,
          mensagemPrefixo: linkForm.mensagemPrefixo || undefined,
          codigoParaEmbutir: linkForm.codigoParaEmbutir || undefined,
        })
        toast.success('Link criado')
      }
      setLinkOpen(false)
      loadLinks()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar link')
    } finally {
      setSavingLink(false)
    }
  }

  async function handleDeleteLink(id: string) {
    if (!confirm('Remover este link?')) return
    try {
      await api.delete(`/links-origem/${id}`)
      toast.success('Link removido')
      loadLinks()
    } catch {
      toast.error('Erro ao remover link')
    }
  }

  function copiarLink(slug: string) {
    navigator.clipboard.writeText(`${WEB_BASE}/r/${slug}`)
    toast.success('Link copiado!')
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Origem de Leads</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Gere um link por canal (Instagram, Site, Google…). Quando alguém clica, é redirecionado
              para o WhatsApp da loja com uma mensagem pré-preenchida — a origem é registrada automaticamente.
            </p>
          </div>
          <Button onClick={openCreateLink}>
            <Plus className="h-4 w-4 mr-2" />
            Criar link
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead>Link curto</TableHead>
                <TableHead>Mensagem pré-preenchida</TableHead>
                <TableHead className="text-right w-24">Cliques</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Link2 className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Nenhum link criado ainda</p>
                      <p className="text-xs">Crie um link por canal e compartilhe na bio, anúncio ou cartão de visita</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{l.rotulo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">/r/{l.slug}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copiarLink(l.slug)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-xs text-muted-foreground truncate">{l.mensagemPrefixo}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                        {l.cliquesTotal}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditLink(l)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteLink(l.id)}>
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

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Editar link' : 'Criar link de rastreamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Canal / Rótulo *</Label>
              <Input
                value={linkForm.rotulo}
                onChange={e => setLinkForm(f => ({ ...f, rotulo: e.target.value }))}
                placeholder="Instagram, Google Ads, Site..."
              />
            </div>
            {!editingLink && (
              <div className="space-y-1.5">
                <Label>Código de rastreio para embutir <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">#</span>
                  <Input
                    value={linkForm.codigoParaEmbutir}
                    onChange={e => setLinkForm(f => ({ ...f, codigoParaEmbutir: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    placeholder="instagram"
                  />
                </div>
                <p className="text-xs text-muted-foreground">O código #xxx será embutido na mensagem para rastrear automaticamente a origem do cliente.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Mensagem pré-preenchida <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                value={linkForm.mensagemPrefixo}
                onChange={e => setLinkForm(f => ({ ...f, mensagemPrefixo: e.target.value }))}
                placeholder={`Olá! Vim pelo ${linkForm.rotulo || 'canal'}.`}
              />
              <p className="text-xs text-muted-foreground">Texto que aparece pré-preenchido no WhatsApp. Se vazio, um texto padrão é gerado.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLink} disabled={savingLink}>
              {savingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLink ? 'Salvar' : 'Criar link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
