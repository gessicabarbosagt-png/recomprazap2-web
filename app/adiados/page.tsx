'use client'

import { useCallback, useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Clock, RefreshCw, Pencil, X, AlertTriangle, Check, Loader2,
} from 'lucide-react'

interface CicloAdiado {
  id: string
  proximaNotificacao: string
  dataOriginalDisparo: string | null
  prazoSolicitadoDias: number | null
  precisaRevisao: boolean
  clienteId: string
  clienteNome: string
  clienteTelefone: string
  produtoNome: string
}

function formatarData(d: string | null) {
  if (!d) return '—'
  return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR })
}

export default function AdiadosPage() {
  const [lista, setLista] = useState<CicloAdiado[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [editando, setEditando] = useState<CicloAdiado | null>(null)
  const [novaData, setNovaData] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ciclos/adiados')
      setLista(data)
    } catch {
      toast.error('Erro ao carregar ciclos adiados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function cancelarAdiamento(id: string) {
    setCancelandoId(id)
    try {
      await api.patch(`/ciclos/${id}/cancelar-adiamento`)
      toast.success('Adiamento cancelado — ciclo voltou à data original')
      setLista(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao cancelar adiamento')
    } finally {
      setCancelandoId(null)
    }
  }

  function abrirEdicao(ciclo: CicloAdiado) {
    setEditando(ciclo)
    const d = new Date(ciclo.proximaNotificacao)
    setNovaData(d.toISOString().slice(0, 10))
  }

  async function salvarData() {
    if (!editando || !novaData) return
    setSalvando(true)
    try {
      await api.patch(`/ciclos/${editando.id}/data-adiamento`, { novaData })
      toast.success('Data atualizada')
      setLista(prev => prev.map(c =>
        c.id === editando.id
          ? { ...c, proximaNotificacao: new Date(novaData).toISOString() }
          : c,
      ))
      setEditando(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar data')
    } finally {
      setSalvando(false)
    }
  }

  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <LayoutShell>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Clock className="h-6 w-6 text-muted-foreground" />
              Adiados a pedido do cliente
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lembretes que o cliente pediu para adiar via WhatsApp. O disparo ocorre automaticamente na nova data.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum ciclo adiado a pedido do cliente.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {lista.map(c => (
              <Card key={c.id} className={c.precisaRevisao ? 'border-orange-400' : ''}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{c.clienteTelefone}</p>
                      {c.precisaRevisao && (
                        <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Revisar
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.produtoNome}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nova data:{' '}
                      <strong>{formatarData(c.proximaNotificacao)}</strong>
                      {c.prazoSolicitadoDias != null && ` (${c.prazoSolicitadoDias} dias solicitados)`}
                      {c.dataOriginalDisparo && (
                        <> · Original: {formatarData(c.dataOriginalDisparo)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirEdicao(c)}
                      title="Editar data de disparo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelarAdiamento(c.id)}
                      disabled={cancelandoId === c.id}
                      title="Cancelar adiamento (volta à data original)"
                      className="text-destructive hover:text-destructive"
                    >
                      {cancelandoId === c.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar data do adiamento</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {editando.clienteNome} — {editando.produtoNome}
              </p>
              <div className="space-y-1.5">
                <Label>Nova data de disparo</Label>
                <Input
                  type="date"
                  value={novaData}
                  min={hoje}
                  onChange={e => setNovaData(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvarData} disabled={salvando || !novaData}>
              {salvando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Check className="mr-2 h-4 w-4" />
              }
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}
