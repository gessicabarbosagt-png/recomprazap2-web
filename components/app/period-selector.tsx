'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ptBR } from 'date-fns/locale'
import { format, differenceInCalendarDays, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronDown } from 'lucide-react'

// ─── Tipo central ─────────────────────────────────────────────────────────────

export type PeriodValue =
  | { type: 'preset'; dias: number }
  | { type: 'custom'; de: string; ate?: string }   // YYYY-MM-DD
  | { type: 'todos' }

const PRESETS = [
  { label: '7 dias',  dias: 7  },
  { label: '15 dias', dias: 15 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
]

// ─── Helpers de formatação ────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseISO(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

function fmtDate(d: Date): string {
  const now = new Date()
  if (d.getFullYear() === now.getFullYear()) {
    return format(d, 'd MMM', { locale: ptBR })
  }
  return format(d, 'd MMM yyyy', { locale: ptBR })
}

/** Rótulo exibido no botão trigger. */
function triggerLabel(v: PeriodValue): string {
  if (v.type === 'preset') {
    const p = PRESETS.find((p) => p.dias === v.dias)
    return `Últimos ${p ? p.label : v.dias + ' dias'}`
  }
  if (v.type === 'custom') {
    const from = fmtDate(parseISO(v.de))
    if (v.ate) return `${from} – ${fmtDate(parseISO(v.ate))}`
    return `desde ${from}`
  }
  return 'Todos'
}

/** Resumo compacto do intervalo para títulos de cards. */
export function periodShortLabel(v: PeriodValue): string {
  if (v.type === 'preset') return `${v.dias}d`
  if (v.type === 'custom') {
    if (v.ate) return `${v.de.slice(5)} – ${v.ate.slice(5)}`
    return `desde ${v.de}`
  }
  return 'todos'
}

/** Resumo legível do range pendente no rodapé do calendário. */
function rangeSummary(range: DateRange | undefined): string {
  if (!range?.from) return 'Selecione o início do período'
  if (!range.to) return `${fmtDate(range.from)} – …`
  const dias = differenceInCalendarDays(range.to, range.from) + 1
  return `${fmtDate(range.from)} – ${fmtDate(range.to)} · ${dias} dia${dias !== 1 ? 's' : ''}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  value: PeriodValue
  onChange: (v: PeriodValue) => void
  showTodos?: boolean
  className?: string
}

export function PeriodSelector({ value, onChange, showTodos = false, className }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined)

  const today = todayMidnight()
  const minDate = subMonths(today, 12)

  function handleOpenChange(next: boolean) {
    if (next) {
      // Inicializa estado pendente com o valor atual ao abrir
      const isCustom = value.type === 'custom'
      setShowCalendar(isCustom)
      setPendingRange(
        isCustom
          ? {
              from: parseISO(value.de),
              to: value.ate ? parseISO(value.ate) : undefined,
            }
          : undefined,
      )
    }
    setOpen(next)
  }

  function applyPreset(dias: number) {
    onChange({ type: 'preset', dias })
    setOpen(false)
  }

  function applyCustom() {
    if (!pendingRange?.from || !pendingRange?.to) return
    onChange({ type: 'custom', de: toISO(pendingRange.from), ate: toISO(pendingRange.to) })
    setOpen(false)
  }

  const isPresetActive = (dias: number) => value.type === 'preset' && value.dias === dias
  const canApply = !!pendingRange?.from && !!pendingRange?.to

  // mês inicial do calendário: mês do "from" selecionado ou mês atual
  const calendarMonth = pendingRange?.from ?? today

  return (
    <div className={cn(className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-8 gap-1.5 text-sm font-normal"
            />
          }
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {triggerLabel(value)}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent align="start" side="bottom" className="w-auto p-0">
          {/* ── Pills ── */}
          <div className="flex flex-wrap gap-1.5 p-3 border-b">
            {PRESETS.map((p) => (
              <button
                key={p.dias}
                type="button"
                onClick={() => applyPreset(p.dias)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  isPresetActive(p.dias)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCalendar(true)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                (value.type === 'custom' || showCalendar)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              Personalizado
            </button>
            {showTodos && (
              <button
                type="button"
                onClick={() => { onChange({ type: 'todos' }); setOpen(false) }}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  value.type === 'todos'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                Todos
              </button>
            )}
          </div>

          {/* ── Calendário de intervalo ── */}
          {showCalendar && (
            <div className="p-3">
              <Calendar
                mode="range"
                selected={pendingRange}
                onSelect={setPendingRange}
                locale={ptBR}
                weekStartsOn={1}
                defaultMonth={calendarMonth}
                disabled={(d) => d > today || d < minDate}
                numberOfMonths={1}
              />
            </div>
          )}

          {/* ── Rodapé ── */}
          {showCalendar && (
            <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                {rangeSummary(pendingRange)}
              </span>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={applyCustom}
                  disabled={!canApply}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── Helpers de URL e API (mantidos para compatibilidade) ─────────────────────

/** Lê period + de + ate dos query params da URL. */
export function parsePeriodFromUrl(
  periodo: string | null | undefined,
  de?: string | null,
  ate?: string | null,
): PeriodValue {
  if (periodo === 'todos') return { type: 'todos' }
  if (periodo === 'custom' && de) return { type: 'custom', de, ate: ate || undefined }
  const raw = periodo?.replace('d', '')
  const dias = raw ? parseInt(raw, 10) : NaN
  const validDias = [7, 15, 30, 90].includes(dias) ? dias : 30
  return { type: 'preset', dias: validDias }
}

/** Converte para query params de URL. */
export function periodValueToUrlParams(v: PeriodValue): URLSearchParams {
  const p = new URLSearchParams()
  if (v.type === 'preset') {
    p.set('periodo', `${v.dias}d`)
  } else if (v.type === 'custom') {
    p.set('periodo', 'custom')
    p.set('de', v.de)
    if (v.ate) p.set('ate', v.ate)
  } else {
    p.set('periodo', 'todos')
  }
  return p
}

/** Converte para parâmetros da API. */
export function periodValueToApiParams(v: PeriodValue): { dias?: number; desde?: string } {
  if (v.type === 'preset') return { dias: v.dias }
  if (v.type === 'custom') return { desde: v.de }
  return {}
}

/** Para endpoints que só aceitam ?dias=N. */
export function periodValueToDias(v: PeriodValue): number {
  if (v.type === 'preset') return v.dias
  if (v.type === 'custom') {
    const to = v.ate ? parseISO(v.ate) : new Date()
    const diff = to.getTime() - parseISO(v.de).getTime()
    return Math.max(1, Math.ceil(diff / 86_400_000) + 1)
  }
  return 30
}

/** Monta a parte period da URL do card do dashboard para o link de pedidos. */
export function periodValueToCardLink(v: PeriodValue, extraParams?: URLSearchParams): string {
  const p = periodValueToUrlParams(v)
  if (extraParams) extraParams.forEach((val, key) => p.set(key, val))
  return `?${p.toString()}`
}
