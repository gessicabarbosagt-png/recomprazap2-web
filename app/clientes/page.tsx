'use client'

import { useEffect, useRef, useState } from 'react'
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
  Plus, Pencil, Trash2, Loader2, Download, Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  telefone: string
  email?: string
  ativo: boolean
  consentimentoWhatsapp: boolean
  origemLead?: string | null
  whatsappNome?: string | null
}

interface ResultadoImport {
  importados: number
  atualizados: number
  totalLinhas: number
  erros: { linha: number; motivo: string }[]
}

function isNomeTelefone(nome: string) {
  return /^\+\d{8,15}$/.test(nome.trim())
}

function nomeDisplay(c: Cliente): string {
  if (isNomeTelefone(c.nome) && c.whatsappNome) return c.whatsappNome
  return c.nome
}

function whatsappTag(c: Cliente): string | null {
  if (!c.whatsappNome) return null
  if (isNomeTelefone(c.nome)) return null
  if (c.whatsappNome === c.nome) return null
  return c.whatsappNome
}

const ORIGENS: Record<string, { label: string; className: string }> = {
  meta_ads:  { label: 'Meta Ads',   className: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  importado: { label: 'Importado',  className: 'bg-muted text-muted-foreground border-border' },
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

const MODELO_CSV = `nome,telefone,email
Maria Silva,+5511999990001,maria@exemplo.com
João Santos,(11) 98888-0002,joao@exemplo.com
Ana Costa,11977770003,`

const empty = { nome: '', telefone: '', email: '', origemLead: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // ── Modal edição/criação ──────────────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(empty)

  // ── Modal importação ─────────────────────────────────────────────────
  const [importarAberto, setImportarAberto] = useState(false)
  const [arquivoImport, setArquivoImport] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<ResultadoImport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Export ───────────────────────────────────────────────────────────
  const [exportando, setExportando] = useState(false)

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

  // ── Exportar CSV ─────────────────────────────────────────────────────

  async function handleExportar() {
    setExportando(true)
    try {
      const { data } = await api.get('/clientes/exportar-csv', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clientes.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setExportando(false)
    }
  }

  // ── Importar CSV ─────────────────────────────────────────────────────

  function abrirImportar() {
    setArquivoImport(null)
    setResultadoImport(null)
    setImportarAberto(true)
  }

  function baixarModelo() {
    const blob = new Blob([MODELO_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_clientes.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleImportar() {
    if (!arquivoImport) return toast.error('Selecione um arquivo CSV')
    setImportando(true)
    const formData = new FormData()
    formData.append('arquivo', arquivoImport)
    try {
      const { data } = await api.post('/clientes/importar-csv', formData)
      setResultadoImport(data)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao importar CSV')
    } finally {
      setImportando(false)
    }
  }

  function fecharImportar() {
    setImportarAberto(false)
    setArquivoImport(null)
    setResultadoImport(null)
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">{clientes.length} cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportar} disabled={exportando}>
              {exportando
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Download className="h-4 w-4 mr-2" />}
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={abrirImportar}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo cliente
            </Button>
          </div>
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
                    <TableCell className="font-medium">
                      <span>{nomeDisplay(c)}</span>
                      {whatsappTag(c) && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          · &ldquo;{whatsappTag(c)}&rdquo;
                        </span>
                      )}
                    </TableCell>
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

      {/* ── Modal: edição / criação ───────────────────────────────────── */}
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

      {/* ── Modal: importar CSV ───────────────────────────────────────── */}
      <Dialog open={importarAberto} onOpenChange={(v) => { if (!v) fecharImportar() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar clientes via CSV</DialogTitle>
          </DialogHeader>

          {!resultadoImport ? (
            <div className="space-y-5 py-2">
              {/* Instruções + modelo */}
              <div className="rounded-md bg-muted/50 border p-3 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  Formato esperado
                </p>
                <p>Colunas aceitas: <code className="text-xs bg-muted px-1 py-0.5 rounded">nome</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">telefone</code> (obrigatório), <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code></p>
                <p>O telefone é normalizado automaticamente (ex: <code className="text-xs">11999990001</code> → <code className="text-xs">+5511999990001</code>).</p>
                <p>Se o telefone já existir na sua base, o cadastro é atualizado — não duplicado.</p>
                <button
                  type="button"
                  onClick={baixarModelo}
                  className="text-primary underline underline-offset-2 text-xs font-medium hover:opacity-80 transition-opacity"
                >
                  Baixar modelo de exemplo (.csv)
                </button>
              </div>

              {/* Seleção de arquivo */}
              <div className="space-y-2">
                <Label>Arquivo CSV</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {arquivoImport ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{arquivoImport.name}</span>
                      <span className="text-muted-foreground">({(arquivoImport.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Clique para selecionar o arquivo</p>
                      <p className="text-xs">Apenas .csv · máx 2 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setArquivoImport(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          ) : (
            /* ── Resultado da importação ─────────────────────────── */
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-emerald-600">{resultadoImport.importados}</p>
                  <p className="text-xs text-muted-foreground mt-1">importados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-blue-600">{resultadoImport.atualizados}</p>
                  <p className="text-xs text-muted-foreground mt-1">atualizados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-destructive">{resultadoImport.erros.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">com erro</p>
                </div>
              </div>

              {resultadoImport.erros.length > 0 && (
                <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Linhas com problema
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {resultadoImport.erros.map((e, i) => (
                      <li key={i} className="text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                        <span className="font-medium shrink-0">Linha {e.linha}:</span>
                        <span>{e.motivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultadoImport.erros.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Todas as {resultadoImport.totalLinhas} linhas processadas com sucesso.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={fecharImportar}>
              {resultadoImport ? 'Fechar' : 'Cancelar'}
            </Button>
            {!resultadoImport && (
              <Button onClick={handleImportar} disabled={importando || !arquivoImport}>
                {importando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando…</>
                  : <><Upload className="mr-2 h-4 w-4" />Importar</>
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
