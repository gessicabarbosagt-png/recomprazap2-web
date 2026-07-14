'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipo central ─────────────────────────────────────────────────────────────

export type PeriodValue =
  | { type: 'preset'; dias: number }
  | { type: 'custom'; de: string }   // YYYY-MM-DD
  | { type: 'todos' }

const PRESETS = [
  { label: '7d',  dias: 7  },
  { label: '15d', dias: 15 },
  { label: '30d', dias: 30 },
  { label: '90d', dias: 90 },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function defaultDeISO() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  value: PeriodValue
  onChange: (v: PeriodValue) => void
  showTodos?: boolean
  className?: string
}

export function PeriodSelector({ value, onChange, showTodos = false, className }: PeriodSelectorProps) {
  const [pickerOpen, setPickerOpen] = useState(value.type === 'custom')
  const [deInput, setDeInput] = useState(value.type === 'custom' ? value.de : defaultDeISO())

  function selectPreset(dias: number) {
    setPickerOpen(false)
    onChange({ type: 'preset', dias })
  }

  function openCustom() {
    setPickerOpen(true)
  }

  function applyCustom() {
    if (!deInput) return
    onChange({ type: 'custom', de: deInput })
  }

  function selectTodos() {
    setPickerOpen(false)
    onChange({ type: 'todos' })
  }

  const isPreset = (dias: number) => value.type === 'preset' && value.dias === dias
  const isCustom = value.type === 'custom'
  const isTodos  = value.type === 'todos'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-0.5 rounded-md border p-0.5 bg-muted/40 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.dias}
            onClick={() => selectPreset(p.dias)}
            className={cn(
              'px-3 py-1 text-sm rounded transition-colors',
              isPreset(p.dias)
                ? 'bg-background shadow-sm font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}

        <button
          onClick={openCustom}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors flex items-center gap-1',
            isCustom
              ? 'bg-background shadow-sm font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {isCustom ? `desde ${value.de}` : 'Personalizado'}
        </button>

        {showTodos && (
          <button
            onClick={selectTodos}
            className={cn(
              'px-3 py-1 text-sm rounded transition-colors',
              isTodos
                ? 'bg-background shadow-sm font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Todos
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-muted-foreground">De:</span>
          <input
            type="date"
            value={deInput}
            max={todayISO()}
            onChange={(e) => setDeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
            className="rounded border px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
          />
          <span className="text-muted-foreground">até hoje</span>
          <button
            onClick={applyCustom}
            className="px-3 py-0.5 rounded bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
          <button
            onClick={() => setPickerOpen(false)}
            className="px-2 py-0.5 rounded text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lê period + de dos query params da URL. */
export function parsePeriodFromUrl(
  periodo: string | null | undefined,
  de?: string | null,
): PeriodValue {
  if (periodo === 'todos') return { type: 'todos' }
  if (periodo === 'custom' && de) return { type: 'custom', de }
  const raw = periodo?.replace('d', '')
  const dias = raw ? parseInt(raw, 10) : NaN
  const validDias = [7, 15, 30, 90].includes(dias) ? dias : 30
  return { type: 'preset', dias: validDias }
}

/** Converte para query params de URL (ex: periodo=30d ou periodo=custom&de=2025-01-01). */
export function periodValueToUrlParams(v: PeriodValue): URLSearchParams {
  const p = new URLSearchParams()
  if (v.type === 'preset') {
    p.set('periodo', `${v.dias}d`)
  } else if (v.type === 'custom') {
    p.set('periodo', 'custom')
    p.set('de', v.de)
  } else {
    p.set('periodo', 'todos')
  }
  return p
}

/** Converte para parâmetros da API (/pedidos?dias=N ou ?desde=YYYY-MM-DD). */
export function periodValueToApiParams(v: PeriodValue): { dias?: number; desde?: string } {
  if (v.type === 'preset') return { dias: v.dias }
  if (v.type === 'custom') return { desde: v.de }
  return {}
}

/** Para endpoints legados que só aceitam ?dias=N (dashboard). */
export function periodValueToDias(v: PeriodValue): number {
  if (v.type === 'preset') return v.dias
  if (v.type === 'custom') {
    const diff = Date.now() - new Date(v.de + 'T00:00:00').getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  return 30
}

/** Monta a parte period da URL do card do dashboard para o link de pedidos. */
export function periodValueToCardLink(v: PeriodValue, extraParams?: URLSearchParams): string {
  const p = periodValueToUrlParams(v)
  if (extraParams) extraParams.forEach((val, key) => p.set(key, val))
  return `?${p.toString()}`
}
