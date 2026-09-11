'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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

type Unidade = 'kg' | 'grama' | 'pacote' | 'unidade'

interface Produto { id: string; nome: string }

interface CicloProduto {
  id: string
  nome: string
  quantidade?: number | null
  unidade?: Unidade | null
}

interface Ciclo {
  id: string
  ativo: boolean
  intervaloDias: number
  horarioEnvio?: string
  proximaNotificacao?: string
  ultimaCompra?: string
  statusUltimoEnvio?: 'sucesso' | 'erro' | null
  clienteId: string
  clienteNome: string
  clienteTelefone: string
  produtos: CicloProduto[]
}

interface Cliente { id: string; nome: string; telefone: string }

// Por-produto: quantidade e unidade
interface ProdutoForm {
  id: string
  quantidade: string
  unidade: Unidade | ''
}

interface FormState {
  clienteId: string
  produtos: ProdutoForm[]
  intervaloDias: string
  horarioEnvio: string
}

const emptyForm: FormState = {
  clienteId: '',
  produtos: [],
  intervaloDias: '30',
  horarioEnvio: '09:00',
}

const UNIDADES: { value: Unidade; label: string }[] = [
  { value: 'kg',      label: 'kg' },
  { value: 'grama',   label: 'grama(s)' },
  { value: 'pacote',  label: 'pacote(s)' },
  { value: 'unidade', label: 'unidade(s)' },
]

function pluralUnidade(u: Unidade | ''): string {
  if (!u) return ''
  const map: Record<Unidade, string> = { kg: 'kg', grama: 'gramas', pacote: 'pacotes', unidade: 'unidades' }
  return map[u]
}

function StatusEnvioIcon({ status }: { status?: string | null }) {
  if (status === 'sucesso') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'erro') return <XCircle className="h-4 w-4 text-red-500" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

function exibirProdutosTabela(produtos: CicloProduto[]) {
  if (!produtos?.length) return <span className="text-muted-foreground">—</span>
  if (produtos.length <= 2) return <span>{produtos.map((p) => p.nome).join(', ')}</span>
  const todos = produtos.map((p) => p.nome).join(', ')
  return (
    <span title={todos}>
      {produtos[0].nome}{' '}
      <span className="text-muted-foreground text-xs">+{produtos.length - 1}</span>
    </span>
  )
}

function formatarPreviaMsg(prods: ProdutoForm[], todosProdutos: Produto[]): string {
  const partes = prods.map((pf) => {
    const prod = todosProdutos.find((p) => p.id === pf.id)
    if (!prod) return ''
    if (pf.quantidade && pf.unidade) {
      return `${pf.quantidade} ${pluralUnidade(pf.unidade)} de ${prod.nome}`
    }
    return prod.nome
  }).filter(Boolean)

  if (partes.length === 0) return ''
  if (partes.length === 1) return partes[0]
  if (partes.length === 2) return `${partes[0]} e ${partes[1]}`
  return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]
}

function CiclosContent() {
  const searchParams = useSearchParams()
  const produtoIdPresel = searchParams.get('produtoId')

  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Ciclo | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [dispararOpen, setDispararOpen] = useState(false)
  const [dispararAll, setDispararAll] = useState(false)
  const [resultadoDisparo, setResultadoDisparo] = useState<{
    sucesso: number; falhas: number
    resultados: { id: string; clienteNome: string; ok: boolean; erro?: string }[]
  } | null>(null)

  const hojeISO = new Date().toLocaleDateString('en-CA')

  const vencidos = ciclos.filter(
    (c) => c.ativo && c.proximaNotificacao && c.proximaNotificacao.slice(0, 10) <= hojeISO,
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

  // Abre modal de criação pré-selecionando produto vindo da URL
  useEffect(() => {
    if (produtoIdPresel && produtos.length > 0 && !open) {
      const existe = produtos.find((p) => p.id === produtoIdPresel)
      if (existe) {
        setEditing(null)
        setForm({
          ...emptyForm,
          produtos: [{ id: produtoIdPresel, quantidade: '', unidade: '' }],
        })
        setOpen(true)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoIdPresel, produtos])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(ciclo: Ciclo) {
    setEditing(ciclo)
    setForm({
      clienteId: ciclo.clienteId,
      produtos: ciclo.produtos?.map((p) => ({
        id: p.id,
        quantidade: p.quantidade != null ? String(p.quantidade) : '',
        unidade: p.unidade ?? '',
      })) ?? [],
      intervaloDias: String(ciclo.intervaloDias),
      horarioEnvio: ciclo.horarioEnvio ?? '09:00',
    })
    setOpen(true)
  }

  function toggleProduto(produtoId: string) {
    setForm((prev) => {
      const jaTemIdx = prev.produtos.findIndex((p) => p.id === produtoId)
      if (jaTemIdx >= 0) {
        return { ...prev, produtos: prev.produtos.filter((p) => p.id !== produtoId) }
      }
      return {
        ...prev,
        produtos: [...prev.produtos, { id: produtoId, quantidade: '', unidade: '' }],
      }
    })
  }

  function updateProdutoForm(produtoId: string, field: 'quantidade' | 'unidade', value: string) {
    setForm((prev) => ({
      ...prev,
      produtos: prev.produtos.map((p) =>
        p.id === produtoId ? { ...p, [field]: value } : p,
      ),
    }))
  }

  async function handleSave() {
    if (!editing && !form.clienteId) return toast.error('Selecione o cliente')
    if (!form.produtos.length) return toast.error('Selecione pelo menos um produto')
    if (!form.intervaloDias || parseInt(form.intervaloDias) < 1) {
      return toast.error('Intervalo deve ser pelo menos 1 dia')
    }
    setSaving(true)
    try {
      const produtosPayload = form.produtos.map((p) => ({
        id: p.id,
        quantidade: p.quantidade ? parseFloat(p.quantidade) : undefined,
        unidade: p.unidade || undefined,
      }))
      const payload: any = {
        intervaloDias: parseInt(form.intervaloDias),
        horarioEnvio: form.horarioEnvio || '09:00',
        produtos: produtosPayload,
      }
      if (!editing) {
        payload.clienteId = form.clienteId
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
      const res = await api.post(`/ciclos/${ciclo.id}/enviar-lembrete`)
      toast.success(`Lembrete enviado para ${ciclo.clienteNome}`)
      const novaProxima: string | undefined = res.data?.proximaNotificacao
      setCiclos((prev) =>
        prev.map((c) => c.id === ciclo.id
          ? { ...c, statusUltimoEnvio: 'sucesso', proximaNotificacao: novaProxima ?? c.proximaNotificacao }
          : c),
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
      const data = res.data
      setResultadoDisparo({ sucesso: data.sucesso, falhas: data.falhas, resultados: data.resultados })
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao disparar lembretes')
    } finally {
      setDispararAll(false)
    }
  }

  function fecharResultado() {
    setResultadoDisparo(null)
    setDispararOpen(false)
  }

  function formatDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  function proximaBadge(data?: string) {
    if (!data) return <span className="text-muted-foreground">—</span>
    const dataISO = data.slice(0, 10)
    const diff = Math.round(
      (new Date(dataISO).getTime() - new Date(hojeISO).getTime()) / 86400000,
    )
    if (diff < 0) return <Badge variant="destructive">Vencido</Badge>
    if (diff === 0) return <Badge variant="destructive">Hoje</Badge>
    if (diff <= 3) return <Badge variant="outline" className="border-orange-400 text-orange-500">Em {diff}d</Badge>
    return <span className="text-sm">{formatDate(data)}</span>
  }

  const previaMsg = formatarPreviaMsg(form.produtos, produtos)

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ciclos de Recompra</h1>
            <p className="text-sm text-muted-foreground mt-1">{ciclos.length} ciclos ativos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => vencidos.length > 0 && setDispararOpen(true)}
              disabled={vencidos.length === 0}
            >
              <SendHorizonal className="h-4 w-4 mr-2" />
              {vencidos.length > 0
                ? `Enviar todos vencidos hoje (${vencidos.length})`
                : 'Nenhum vencido hoje'}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo ciclo
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto(s)</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Horário</TableHead>
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
                    <TableCell>{exibirProdutosTabela(c.produtos)}</TableCell>
                    <TableCell>{c.intervaloDias}d</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {c.horarioEnvio ? c.horarioEnvio.slice(0, 5) : '—'}
                      </span>
                    </TableCell>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ciclo' : 'Novo ciclo de recompra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v || '' })}>
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
            )}

            {/* Multi-select de produtos com quantidade/unidade por produto */}
            <div className="space-y-1.5">
              <Label>Produto(s) *</Label>
              <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
                {produtos.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">Nenhum produto cadastrado</p>
                ) : (
                  produtos.map((p) => {
                    const selecionado = form.produtos.find((pf) => pf.id === p.id)
                    return (
                      <div key={p.id} className="px-3 py-2">
                        <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 select-none -mx-3 px-3 py-1 rounded">
                          <Checkbox
                            checked={!!selecionado}
                            onCheckedChange={() => toggleProduto(p.id)}
                          />
                          <span className="text-sm font-medium">{p.nome}</span>
                        </label>
                        {selecionado && (
                          <div className="mt-2 ml-7 flex gap-2">
                            <div className="flex-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Qtde."
                                value={selecionado.quantidade}
                                onChange={(e) => updateProdutoForm(p.id, 'quantidade', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="w-36">
                              <Select
                                value={selecionado.unidade}
                                onValueChange={(v) => updateProdutoForm(p.id, 'unidade', v || '')}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              {form.produtos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.produtos.length} produto{form.produtos.length !== 1 ? 's' : ''} selecionado{form.produtos.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Intervalo (dias) *</Label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={form.intervaloDias}
                onChange={(e) => setForm({ ...form, intervaloDias: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">A cada quantos dias o cliente costuma comprar de novo</p>
            </div>

            <div className="space-y-1.5">
              <Label>Horário de envio automático</Label>
              <Input
                type="time"
                value={form.horarioEnvio}
                onChange={(e) => setForm({ ...form, horarioEnvio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                O disparo automático só ocorre após este horário (fuso de SP/BRT). Envios manuais funcionam a qualquer hora.
              </p>
            </div>

            {previaMsg && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Prévia na mensagem de lembrete:</p>
                <p>Já está na hora de repor <strong>{previaMsg}</strong>.</p>
              </div>
            )}
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

      {/* Modal: enviar todos vencidos */}
      <Dialog open={dispararOpen} onOpenChange={(v) => { if (!dispararAll) { setDispararOpen(v); if (!v) setResultadoDisparo(null) } }}>
        <DialogContent>
          {resultadoDisparo ? (
            <>
              <DialogHeader>
                <DialogTitle>Resultado do envio em massa</DialogTitle>
                <DialogDescription>
                  {resultadoDisparo.falhas === 0
                    ? `${resultadoDisparo.sucesso} lembrete${resultadoDisparo.sucesso !== 1 ? 's' : ''} enviado${resultadoDisparo.sucesso !== 1 ? 's' : ''} com sucesso.`
                    : `${resultadoDisparo.sucesso} enviado${resultadoDisparo.sucesso !== 1 ? 's' : ''} com sucesso, ${resultadoDisparo.falhas} falhou${resultadoDisparo.falhas !== 1 ? 'am' : ''}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-1 max-h-60 overflow-y-auto">
                {resultadoDisparo.resultados.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-sm">
                    {r.ok
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                    <span>
                      <span className="font-medium">{r.clienteNome}</span>
                      {!r.ok && r.erro && (
                        <span className="text-muted-foreground ml-1">— {r.erro}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={fecharResultado}>Fechar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enviar lembretes em massa</DialogTitle>
                <DialogDescription>
                  Você está prestes a enviar {vencidos.length} lembrete{vencidos.length !== 1 ? 's' : ''} agora. Confirmar?
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-1 max-h-48 overflow-y-auto">
                {vencidos.map((c) => (
                  <div key={c.id} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                    <span>{c.clienteNome}</span>
                    <span className="text-muted-foreground text-xs">
                      — {c.produtos?.map((p) => p.nome).join(', ') ?? ''}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDispararOpen(false)} disabled={dispararAll}>Cancelar</Button>
                <Button onClick={handleDispararTodos} disabled={dispararAll || vencidos.length === 0}>
                  {dispararAll
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                    : <><SendHorizonal className="mr-2 h-4 w-4" />Enviar {vencidos.length} lembrete{vencidos.length !== 1 ? 's' : ''}</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}

export default function CiclosPage() {
  return (
    <Suspense>
      <CiclosContent />
    </Suspense>
  )
}
