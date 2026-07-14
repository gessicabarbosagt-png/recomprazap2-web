'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Plus, Pencil, Check, X, Trash2, KanbanSquare, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Etapa {
  id: string
  nome: string
  ordem: number
  tipo: 'intermediaria' | 'final_comprou' | 'final_nao_comprou'
  ativo: boolean
  createdAt: string
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function JornadaPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function load() {
    try {
      const { data } = await api.get('/etapas-jornada')
      setEtapas(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Erro ao carregar etapas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Inline edit ────────────────────────────────────────────────────────────

  function iniciarEdicao(etapa: Etapa) {
    setEditandoId(etapa.id)
    setEditNome(etapa.nome)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditNome('')
  }

  async function salvarNome(etapa: Etapa) {
    if (!editNome.trim()) return toast.error('Nome não pode ser vazio')
    if (editNome.trim() === etapa.nome) { cancelarEdicao(); return }
    setSalvandoId(etapa.id)
    try {
      await api.patch(`/etapas-jornada/${etapa.id}`, { nome: editNome.trim() })
      toast.success('Nome atualizado')
      await load()
      cancelarEdicao()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSalvandoId(null)
    }
  }

  // ── Ativar/Desativar ───────────────────────────────────────────────────────

  async function toggleAtivo(etapa: Etapa) {
    setSalvandoId(etapa.id)
    try {
      await api.patch(`/etapas-jornada/${etapa.id}`, { ativo: !etapa.ativo })
      toast.success(etapa.ativo ? 'Etapa desativada' : 'Etapa ativada')
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar')
    } finally {
      setSalvandoId(null)
    }
  }

  // ── Reordenar ──────────────────────────────────────────────────────────────

  async function moverOrdem(etapa: Etapa, direcao: 'cima' | 'baixo') {
    const intermediarias = etapas.filter((e) => e.tipo === 'intermediaria').sort((a, b) => a.ordem - b.ordem)
    const idx = intermediarias.findIndex((e) => e.id === etapa.id)
    const alvo = direcao === 'cima' ? intermediarias[idx - 1] : intermediarias[idx + 1]
    if (!alvo) return

    setSalvandoId(etapa.id)
    try {
      // Troca as ordens
      await Promise.all([
        api.patch(`/etapas-jornada/${etapa.id}`, { ordem: alvo.ordem }),
        api.patch(`/etapas-jornada/${alvo.id}`, { ordem: etapa.ordem }),
      ])
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao reordenar')
    } finally {
      setSalvandoId(null)
    }
  }

  // ── Remover ────────────────────────────────────────────────────────────────

  async function remover(etapa: Etapa) {
    if (!confirm(`Remover etapa "${etapa.nome}"?\n\nEssa ação não pode ser desfeita.`)) return
    setSalvandoId(etapa.id)
    try {
      await api.delete(`/etapas-jornada/${etapa.id}`)
      toast.success('Etapa removida')
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao remover')
    } finally {
      setSalvandoId(null)
    }
  }

  // ── Criar nova ─────────────────────────────────────────────────────────────

  async function criarEtapa() {
    if (!novaEtapaNome.trim()) return toast.error('Nome é obrigatório')
    setCriando(true)
    try {
      await api.post('/etapas-jornada', { nome: novaEtapaNome.trim() })
      toast.success('Etapa criada')
      setNovaEtapaNome('')
      setMostrarForm(false)
      await load()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar etapa')
    } finally {
      setCriando(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const intermediarias = etapas.filter((e) => e.tipo === 'intermediaria').sort((a, b) => a.ordem - b.ordem)
  const finais = etapas.filter((e) => e.tipo !== 'intermediaria')

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <LayoutShell>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KanbanSquare className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Jornada de Compra</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Configure as etapas do processo de venda. Arraste ou use as setas para reordenar as etapas intermediárias.
            </p>
          </div>
          {!mostrarForm && (
            <Button onClick={() => setMostrarForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar etapa
            </Button>
          )}
        </div>

        {/* Formulário de nova etapa */}
        {mostrarForm && (
          <div className="rounded-md border bg-muted/30 p-4 flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Nome da etapa</label>
              <Input
                autoFocus
                placeholder="Ex: Proposta enviada"
                value={novaEtapaNome}
                onChange={(e) => setNovaEtapaNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') criarEtapa()
                  if (e.key === 'Escape') { setMostrarForm(false); setNovaEtapaNome('') }
                }}
              />
            </div>
            <Button onClick={criarEtapa} disabled={criando}>
              {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
            <Button variant="ghost" onClick={() => { setMostrarForm(false); setNovaEtapaNome('') }}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Lista de etapas */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Intermediárias */}
            {intermediarias.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Etapas intermediárias
                </p>
                <div className="space-y-2">
                  {intermediarias.map((etapa, idx) => (
                    <EtapaRow
                      key={etapa.id}
                      etapa={etapa}
                      idx={idx}
                      total={intermediarias.length}
                      editandoId={editandoId}
                      editNome={editNome}
                      salvandoId={salvandoId}
                      onEditNome={setEditNome}
                      onIniciarEdicao={iniciarEdicao}
                      onSalvarNome={salvarNome}
                      onCancelarEdicao={cancelarEdicao}
                      onToggleAtivo={toggleAtivo}
                      onMover={moverOrdem}
                      onRemover={remover}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Etapas finais */}
            {finais.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Etapas finais
                </p>
                <div className="space-y-2">
                  {finais.map((etapa) => (
                    <EtapaRow
                      key={etapa.id}
                      etapa={etapa}
                      idx={0}
                      total={1}
                      editandoId={editandoId}
                      editNome={editNome}
                      salvandoId={salvandoId}
                      onEditNome={setEditNome}
                      onIniciarEdicao={iniciarEdicao}
                      onSalvarNome={salvarNome}
                      onCancelarEdicao={cancelarEdicao}
                      onToggleAtivo={toggleAtivo}
                      onMover={moverOrdem}
                      onRemover={remover}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </LayoutShell>
  )
}

// ─── Sub-componente EtapaRow ─────────────────────────────────────────────────

interface EtapaRowProps {
  etapa: Etapa
  idx: number
  total: number
  editandoId: string | null
  editNome: string
  salvandoId: string | null
  onEditNome: (v: string) => void
  onIniciarEdicao: (e: Etapa) => void
  onSalvarNome: (e: Etapa) => void
  onCancelarEdicao: () => void
  onToggleAtivo: (e: Etapa) => void
  onMover: (e: Etapa, d: 'cima' | 'baixo') => void
  onRemover: (e: Etapa) => void
}

function EtapaRow({
  etapa, idx, total,
  editandoId, editNome, salvandoId,
  onEditNome, onIniciarEdicao, onSalvarNome, onCancelarEdicao,
  onToggleAtivo, onMover, onRemover,
}: EtapaRowProps) {
  const isEditing = editandoId === etapa.id
  const isSaving = salvandoId === etapa.id
  const isFinal = etapa.tipo !== 'intermediaria'

  const tipoBadge = isFinal
    ? { label: 'Final', className: 'bg-purple-100 text-purple-700 border-purple-200' }
    : null

  const tipoColor = etapa.tipo === 'final_comprou'
    ? 'bg-emerald-50 border-emerald-200'
    : etapa.tipo === 'final_nao_comprou'
    ? 'bg-red-50 border-red-200'
    : 'bg-white'

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-md border px-4 py-3 transition-opacity',
      tipoColor,
      !etapa.ativo && 'opacity-50',
    )}>
      {/* Ordem numérica (somente intermediárias) */}
      {!isFinal && (
        <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
          {etapa.ordem}
        </span>
      )}
      {isFinal && <span className="w-5 flex-shrink-0" />}

      {/* Nome / edição inline */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            autoFocus
            value={editNome}
            onChange={(e) => onEditNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSalvarNome(etapa)
              if (e.key === 'Escape') onCancelarEdicao()
            }}
            className="h-7 text-sm"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('text-sm font-medium truncate', !etapa.ativo && 'line-through text-muted-foreground')}>
              {etapa.nome}
            </span>
            {tipoBadge && (
              <span className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0',
                tipoBadge.className,
              )}>
                {tipoBadge.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isEditing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
              onClick={() => onSalvarNome(etapa)}
              disabled={isSaving}
              title="Salvar"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onCancelarEdicao}
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            {/* Reordenar (somente intermediárias) */}
            {!isFinal && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onMover(etapa, 'cima')}
                  disabled={idx === 0 || isSaving}
                  title="Mover para cima"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onMover(etapa, 'baixo')}
                  disabled={idx === total - 1 || isSaving}
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* Editar nome */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onIniciarEdicao(etapa)}
              disabled={isSaving}
              title="Editar nome"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>

            {/* Ativar/desativar (somente intermediárias) */}
            {!isFinal && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onToggleAtivo(etapa)}
                disabled={isSaving}
                title={etapa.ativo ? 'Desativar' : 'Ativar'}
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : (etapa.ativo ? 'Desativar' : 'Ativar')}
              </Button>
            )}

            {/* Remover (somente intermediárias) */}
            {!isFinal && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemover(etapa)}
                disabled={isSaving}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
