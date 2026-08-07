'use client'

import { useCallback, useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BellOff, Send, Trash2, Loader2, RefreshCw } from 'lucide-react'

interface Represado {
  id: string
  agendadoPara: string
  clienteNome: string
  clienteTelefone: string
  produtoNome: string
  produtoUnidade: string | null
  quantidade: number | null
}

function formatarData(d: string) {
  return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export default function RepresadosPage() {
  const [lista, setLista] = useState<Represado[]>([])
  const [loading, setLoading] = useState(true)
  const [enviandoTodos, setEnviandoTodos] = useState(false)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [descartandoId, setDescartandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/lembretes/represados')
      setLista(data)
    } catch {
      toast.error('Erro ao carregar lembretes represados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function enviarUm(id: string) {
    setEnviandoId(id)
    try {
      await api.post(`/lembretes/${id}/enviar-represado`)
      toast.success('Lembrete enviado!')
      setLista(prev => prev.filter(l => l.id !== id))
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao enviar lembrete')
    } finally {
      setEnviandoId(null)
    }
  }

  async function descartar(id: string) {
    setDescartandoId(id)
    try {
      await api.delete(`/lembretes/${id}/descartar`)
      toast.success('Lembrete descartado')
      setLista(prev => prev.filter(l => l.id !== id))
    } catch {
      toast.error('Erro ao descartar lembrete')
    } finally {
      setDescartandoId(null)
    }
  }

  async function enviarTodos() {
    if (!window.confirm(`Enviar todos os ${lista.length} lembretes represados agora?`)) return
    setEnviandoTodos(true)
    try {
      const { data } = await api.post('/lembretes/represados/enviar-todos')
      toast.success(`${data.enviados} enviados${data.erros ? `, ${data.erros} com erro` : ''}`)
      await carregar()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao enviar todos')
    } finally {
      setEnviandoTodos(false)
    }
  }

  return (
    <LayoutShell>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BellOff className="h-6 w-6 text-muted-foreground" />
              Lembretes Represados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lembretes que venceram enquanto o WhatsApp estava desconectado.
              Revise e envie individualmente ou todos de uma vez.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            {lista.length > 0 && (
              <Button size="sm" onClick={enviarTodos} disabled={enviandoTodos}>
                {enviandoTodos
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando…</>
                  : <><Send className="h-4 w-4 mr-1" /> Enviar todos ({lista.length})</>
                }
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : lista.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum lembrete represado. Tudo em dia! 🎉
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {lista.map(l => (
              <Card key={l.id}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.clienteNome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.produtoNome}
                      {l.quantidade ? ` — ${l.quantidade}${l.produtoUnidade ? ` ${l.produtoUnidade}` : ''}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Agendado para {formatarData(l.agendadoPara)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => descartar(l.id)}
                      disabled={descartandoId === l.id || enviandoId === l.id}
                      title="Descartar lembrete"
                    >
                      {descartandoId === l.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => enviarUm(l.id)}
                      disabled={enviandoId === l.id || descartandoId === l.id}
                    >
                      {enviandoId === l.id
                        ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando…</>
                        : <><Send className="h-4 w-4 mr-1" /> Enviar</>
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  )
}
