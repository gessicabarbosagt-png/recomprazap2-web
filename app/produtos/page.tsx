'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { useChecklist } from '@/lib/checklist-context'
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
import { Plus, Pencil, Trash2, Loader2, Upload, RefreshCw, X, AlertTriangle } from 'lucide-react'

interface Produto {
  id: string
  nome: string
  descricao?: string
  preco?: number
  especificacao?: string
  estoque?: number | null
  ativo: boolean
}

const empty = { nome: '', descricao: '', preco: '', especificacao: '', estoque: '' }

interface CsvRow {
  nome: string
  preco: number | undefined
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur)
      cur = ''
    } else if (ch === ';' && !inQuotes) {
      cols.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur)
  return cols
}

function parsePreco(raw: string): number | undefined {
  if (!raw) return undefined
  const cleaned = raw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? undefined : n
}

function EstoqueBadge({ estoque }: { estoque?: number | null }) {
  if (estoque == null) return null
  if (estoque === 0) return <Badge variant="destructive" className="text-xs">Sem estoque</Badge>
  if (estoque <= 3) return <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white">Estoque baixo</Badge>
  return null
}

export default function ProdutosPage() {
  const { refetch: refetchChecklist } = useChecklist()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [form, setForm] = useState(empty)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [filtroEstoqueBaixo, setFiltroEstoqueBaixo] = useState(false)
  // Nudge: produto recém-criado
  const [nudgeProduto, setNudgeProduto] = useState<{ id: string; nome: string } | null>(null)

  async function load() {
    try {
      const { data } = await api.get('/produtos')
      setProdutos(data)
    } catch {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const produtosFiltrados = filtroEstoqueBaixo
    ? produtos.filter((p) => p.estoque != null && p.estoque <= 3)
    : produtos

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(p: Produto) {
    setEditing(p)
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: p.preco != null ? String(p.preco) : '',
      especificacao: p.especificacao ?? '',
      estoque: p.estoque != null ? String(p.estoque) : '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nome) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || undefined,
        preco: form.preco ? parseFloat(form.preco) : undefined,
        especificacao: form.especificacao || undefined,
        estoque: form.estoque !== '' ? parseFloat(form.estoque) : null,
      }
      if (editing) {
        await api.patch(`/produtos/${editing.id}`, payload)
        toast.success('Produto atualizado')
        setOpen(false)
        load()
      } else {
        const { data } = await api.post('/produtos', payload)
        setOpen(false)
        await load()
        refetchChecklist()
        setNudgeProduto({ id: data.id, nome: form.nome })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este produto?')) return
    try {
      await api.delete(`/produtos/${id}`)
      toast.success('Produto removido')
      load()
    } catch {
      toast.error('Erro ao remover produto')
    }
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const rows: CsvRow[] = lines.slice(1).map((line) => {
        const cols = parseCSVLine(line)
        const nome = cols[0]?.trim().replace(/^"|"$/g, '') ?? ''
        const precoRaw = cols[4]?.trim().replace(/^"|"$/g, '') ?? ''
        return { nome, preco: parsePreco(precoRaw) }
      }).filter((r) => r.nome)
      setCsvRows(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImportCSV() {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    let ok = 0
    let fail = 0
    for (const row of csvRows) {
      try {
        await api.post('/produtos', { nome: row.nome, preco: row.preco })
        ok++
      } catch {
        fail++
      }
    }
    setCsvImporting(false)
    setCsvOpen(false)
    setCsvRows([])
    if (fail === 0) {
      toast.success(`${ok} produto${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''} com sucesso`)
    } else {
      toast.warning(`${ok} importado${ok !== 1 ? 's' : ''}, ${fail} com erro`)
    }
    load()
    refetchChecklist()
  }

  function formatPreco(p?: number) {
    if (p == null) return '—'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p)
  }

  const totalEstoqueBaixo = produtos.filter((p) => p.estoque != null && p.estoque <= 3).length

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-sm text-muted-foreground mt-1">{produtos.length} no catálogo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setCsvRows([]); setCsvOpen(true) }}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo produto
            </Button>
          </div>
        </div>

        {/* Nudge: cadastrar clientes após criar produto */}
        {nudgeProduto && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-3">
            <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-medium">{nudgeProduto.nome}</span> criado com sucesso!
              {' '}Agora cadastre seus clientes para poder criar ciclos de recompra.
            </p>
            <Link
              href="/clientes"
              className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
              onClick={() => setNudgeProduto(null)}
            >
              Cadastrar clientes →
            </Link>
            <button
              onClick={() => setNudgeProduto(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filtro estoque baixo */}
        {totalEstoqueBaixo > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltroEstoqueBaixo((v) => !v)}
              className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 border transition-colors ${
                filtroEstoqueBaixo
                  ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-800 dark:text-amber-300'
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-amber-400 hover:text-amber-700'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {filtroEstoqueBaixo
                ? `Mostrando ${totalEstoqueBaixo} com estoque baixo — limpar filtro`
                : `Filtrar por estoque baixo (${totalEstoqueBaixo})`}
            </button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Especificação</TableHead>
                <TableHead>Estoque</TableHead>
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
              ) : produtosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    {filtroEstoqueBaixo ? 'Nenhum produto com estoque baixo' : 'Nenhum produto cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                produtosFiltrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {p.nome}
                        <EstoqueBadge estoque={p.estoque} />
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{p.descricao || '—'}</TableCell>
                    <TableCell>{formatPreco(p.preco)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.especificacao || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.estoque != null ? p.estoque : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'secondary'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
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
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Especificação</Label>
                <Input placeholder="ex: 1kg, 500g, pacote com 6" value={form.especificacao} onChange={(e) => setForm({ ...form, especificacao: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estoque</Label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="Deixe em branco para não controlar"
                value={form.estoque}
                onChange={(e) => setForm({ ...form, estoque: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Será decrementado automaticamente quando um pedido for confirmado como comprado.
              </p>
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

      <Dialog open={csvOpen} onOpenChange={(v) => { setCsvOpen(v); if (!v) setCsvRows([]) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar produtos via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              O arquivo deve ter o nome na 1ª coluna e o preço (formato R$ 00,00) na 5ª coluna. A primeira linha é ignorada (cabeçalho).
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFile}
              className="cursor-pointer"
            />
            {csvRows.length > 0 && (
              <div className="rounded-md border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.nome}</TableCell>
                        <TableCell>{r.preco != null ? formatPreco(r.preco) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {csvRows.length > 0 && (
              <p className="text-sm text-muted-foreground">{csvRows.length} produto{csvRows.length !== 1 ? 's' : ''} encontrado{csvRows.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportCSV} disabled={csvRows.length === 0 || csvImporting}>
              {csvImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar {csvRows.length > 0 ? csvRows.length : ''} produto{csvRows.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
