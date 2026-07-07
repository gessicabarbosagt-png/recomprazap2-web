'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2, Send, Save, Info } from 'lucide-react'

// ----------------------------------------------------------------
// Schema de validação
// ----------------------------------------------------------------

const ACOES = [
  { value: 'registrar_pedido', label: 'Registrar pedido e avisar você' },
  { value: 'adiar_lembrete', label: 'Adiar o lembrete' },
  { value: 'cancelar_ciclo', label: 'Cancelar lembretes deste produto' },
  { value: 'nenhuma', label: 'Nenhuma ação' },
] as const

const DIAS_OPTIONS = [3, 7, 15, 30]

const opcaoSchema = z.object({
  gatilho: z.string().min(1, 'Gatilho obrigatório'),
  rotulo: z.string().min(1, 'Rótulo obrigatório'),
  mensagem_resposta: z.string().min(1, 'Mensagem de resposta obrigatória'),
  acao: z.enum(['registrar_pedido', 'adiar_lembrete', 'cancelar_ciclo', 'nenhuma']),
  acao_params: z.object({ dias: z.number().optional() }).optional(),
})

const fluxoSchema = z.object({
  mensagem_lembrete: z.string().min(1, 'Mensagem do lembrete obrigatória'),
  mensagem_fallback: z.string().min(1, 'Mensagem de fallback obrigatória'),
  opcoes: z
    .array(opcaoSchema)
    .min(1, 'Informe pelo menos 1 opção')
    .max(5, 'Máximo de 5 opções')
    .refine(
      (ops) => new Set(ops.map((o) => o.gatilho)).size === ops.length,
      { message: 'Gatilhos duplicados — cada opção deve ter um gatilho único' },
    ),
})

type FluxoForm = z.infer<typeof fluxoSchema>

const VARIAVEIS = ['{nome}', '{produto}', '{quantidade}', '{loja}']

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------

export default function FluxoPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testarOpen, setTestarOpen] = useState(false)
  const [testarTelefone, setTestarTelefone] = useState('')
  const [testandoEnvio, setTestandoEnvio] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FluxoForm>({
    resolver: zodResolver(fluxoSchema),
    defaultValues: {
      mensagem_lembrete: '',
      mensagem_fallback: '',
      opcoes: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'opcoes' })
  const watchedOpcoes = watch('opcoes')
  const watchedLembrete = watch('mensagem_lembrete')

  // ---- Carrega fluxo ----
  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/fluxo-conversa')
      reset({
        mensagem_lembrete: data.mensagem_lembrete ?? data.mensagemLembrete ?? '',
        mensagem_fallback: data.mensagem_fallback ?? data.mensagemFallback ?? '',
        opcoes: (data.opcoes ?? []).map((o: any) => ({
          gatilho: o.gatilho,
          rotulo: o.rotulo,
          mensagem_resposta: o.mensagem_resposta,
          acao: o.acao,
          acao_params: o.acao_params,
        })),
      })
    } catch {
      toast.error('Erro ao carregar fluxo de conversa')
    } finally {
      setLoading(false)
    }
  }, [reset])

  useEffect(() => { carregar() }, [carregar])

  // ---- Salvar ----
  const onSubmit = async (data: FluxoForm) => {
    setSaving(true)
    try {
      await api.put('/fluxo-conversa', data)
      toast.success('Fluxo salvo com sucesso!')
      reset(data) // marca como não sujo após salvar
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar fluxo'))
    } finally {
      setSaving(false)
    }
  }

  // ---- Testar ----
  async function enviarTeste() {
    if (!testarTelefone.trim()) {
      toast.error('Informe seu telefone')
      return
    }
    setTestandoEnvio(true)
    try {
      const res = await api.post('/fluxo-conversa/testar', { telefone: testarTelefone.trim() })
      if (res.data.aviso) {
        toast.warning(res.data.aviso)
      } else {
        toast.success('Mensagem de teste enviada! Responda no seu WhatsApp para testar o fluxo completo.')
      }
      setTestarOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(msg ?? 'Erro ao enviar teste')
    } finally {
      setTestandoEnvio(false)
    }
  }

  function adicionarOpcao() {
    const proximoGatilho = String((watchedOpcoes?.length ?? 0) + 1)
    append({
      gatilho: proximoGatilho,
      rotulo: '',
      mensagem_resposta: '',
      acao: 'nenhuma',
    })
  }

  const previewLembrete = watchedLembrete
    ? watchedLembrete
        .replace(/\{nome\}/g, 'Maria')
        .replace(/\{produto\}/g, 'Ração Golden')
        .replace(/\{quantidade\}/g, ' (2 kg)')
        .replace(/\{loja\}/g, 'Sua Loja')
    : ''

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Fluxo de conversa</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure o que o RecompraZap envia e como responde ao cliente.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestarOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Testar
            </Button>
            <Button type="submit" disabled={saving || !isDirty}>
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</>
                : <><Save className="h-4 w-4 mr-2" /> Salvar fluxo</>
              }
            </Button>
          </div>
        </div>

        {/* Mensagem do lembrete */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagem do lembrete</CardTitle>
            <CardDescription>
              Texto enviado ao cliente quando o ciclo de recompra é acionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VariaveisHint />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <textarea
                  {...register('mensagem_lembrete')}
                  rows={9}
                  placeholder="Oi, {nome}! Está na hora de repor {produto}…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.mensagem_lembrete && (
                  <p className="text-xs text-destructive">{errors.mensagem_lembrete.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="min-h-[196px] rounded-md border bg-[#e5ddd5] p-3">
                  <div className="max-w-[85%] ml-auto bg-[#dcf8c6] rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap text-gray-800">{previewLembrete}</p>
                    <p className="text-[10px] text-gray-400 text-right mt-1">agora ✓✓</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opções de resposta */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Opções de resposta</CardTitle>
                <CardDescription>
                  O que acontece quando o cliente responde com cada número.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarOpcao}
                disabled={(fields.length ?? 0) >= 5}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar opção
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma opção configurada. Clique em &ldquo;Adicionar opção&rdquo;.
              </p>
            )}

            {fields.map((field, index) => {
              const acaoValue = watchedOpcoes?.[index]?.acao
              return (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-base font-bold h-8 w-8 flex items-center justify-center p-0 flex-shrink-0">
                      <Controller
                        control={control}
                        name={`opcoes.${index}.gatilho`}
                        render={({ field: f }) => (
                          <input
                            {...f}
                            maxLength={1}
                            className="w-full text-center bg-transparent font-bold text-sm outline-none"
                            title="Gatilho (número que o cliente digita)"
                          />
                        )}
                      />
                    </Badge>
                    <div className="flex-1">
                      <Input
                        {...register(`opcoes.${index}.rotulo`)}
                        placeholder="Ex: Quero pedir"
                      />
                      {errors.opcoes?.[index]?.rotulo && (
                        <p className="text-xs text-destructive mt-1">{errors.opcoes[index]!.rotulo!.message}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mensagem de resposta</Label>
                    <textarea
                      {...register(`opcoes.${index}.mensagem_resposta`)}
                      rows={3}
                      placeholder="O que o bot responde quando o cliente escolhe esta opção…"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.opcoes?.[index]?.mensagem_resposta && (
                      <p className="text-xs text-destructive">{errors.opcoes[index]!.mensagem_resposta!.message}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1 flex-1 min-w-[180px]">
                      <Label className="text-xs text-muted-foreground">Ação</Label>
                      <Controller
                        control={control}
                        name={`opcoes.${index}.acao`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione…" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACOES.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {acaoValue === 'adiar_lembrete' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Adiar por</Label>
                        <Controller
                          control={control}
                          name={`opcoes.${index}.acao_params.dias`}
                          render={({ field: f }) => (
                            <Select
                              value={String(f.value ?? 7)}
                              onValueChange={(v) => f.onChange(Number(v))}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DIAS_OPTIONS.map((d) => (
                                  <SelectItem key={d} value={String(d)}>
                                    {d} dias
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {errors.opcoes?.root && (
              <p className="text-xs text-destructive">{errors.opcoes.root.message}</p>
            )}
            {typeof errors.opcoes?.message === 'string' && (
              <p className="text-xs text-destructive">{errors.opcoes.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Fallback */}
        <Card>
          <CardHeader>
            <CardTitle>Resposta para mensagem não reconhecida</CardTitle>
            <CardDescription>
              Enviado quando o cliente responde algo que não corresponde a nenhum gatilho.
              Após 2 tentativas sem sucesso, o bot para de responder automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              {...register('mensagem_fallback')}
              rows={3}
              placeholder="Não entendi sua resposta. Por favor, responda com 1, 2 ou 3…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.mensagem_fallback && (
              <p className="text-xs text-destructive">{errors.mensagem_fallback.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Botões de rodapé */}
        <div className="flex justify-end gap-2 pb-8">
          <Button type="button" variant="outline" onClick={() => setTestarOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Testar no meu WhatsApp
          </Button>
          <Button type="submit" disabled={saving || !isDirty}>
            {saving
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</>
              : <><Save className="h-4 w-4 mr-2" /> Salvar fluxo</>
            }
          </Button>
        </div>
      </form>

      {/* Dialog de teste */}
      <Dialog open={testarOpen} onOpenChange={setTestarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testar no meu WhatsApp</DialogTitle>
            <DialogDescription>
              Informe seu número para receber a mensagem do lembrete e testar as respostas em tempo real.
              Seu telefone precisa estar cadastrado como cliente desta loja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Seu telefone (com código do país)</Label>
            <Input
              placeholder="+55 11 99999-0000"
              value={testarTelefone}
              onChange={(e) => setTestarTelefone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarTeste()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarTeste} disabled={testandoEnvio}>
              {testandoEnvio
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
                : <><Send className="h-4 w-4 mr-2" /> Enviar teste</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  )
}

function VariaveisHint() {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>
        Variáveis disponíveis:{' '}
        {['{nome}', '{produto}', '{quantidade}', '{loja}'].map((v) => (
          <code key={v} className="bg-muted rounded px-1 mr-1">{v}</code>
        ))}
      </span>
    </div>
  )
}
