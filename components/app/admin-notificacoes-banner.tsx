'use client'

import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface Notificacao {
  id: string
  mensagem: string
  tipo: string | null
  criadoEm: string
}

const ESTILO: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
  falha_silenciosa_inbox: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-900 dark:text-amber-300',
    iconColor: 'text-amber-600',
  },
}

const PADRAO = {
  bg: 'bg-blue-50 dark:bg-blue-950/40',
  border: 'border-blue-200 dark:border-blue-800',
  text: 'text-blue-900 dark:text-blue-300',
  iconColor: 'text-blue-600',
}

export function AdminNotificacoesBanner() {
  const { usuario } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])

  useEffect(() => {
    if (!usuario || usuario.role === 'admin') return
    api.get('/notificacoes')
      .then(({ data }) => setNotificacoes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [usuario])

  async function dispensar(id: string) {
    setNotificacoes(prev => prev.filter(n => n.id !== id))
    await api.patch(`/notificacoes/${id}/lida`).catch(() => {})
  }

  if (notificacoes.length === 0) return null

  return (
    <div className="space-y-px">
      {notificacoes.map(n => {
        const estilo = (n.tipo && ESTILO[n.tipo]) ? ESTILO[n.tipo] : PADRAO
        const IconeAlerta = n.tipo === 'falha_silenciosa_inbox' ? AlertTriangle : Bell
        return (
          <div
            key={n.id}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b text-sm ${estilo.bg} ${estilo.border} ${estilo.text}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <IconeAlerta className={`h-4 w-4 flex-shrink-0 ${estilo.iconColor}`} />
              <span className="truncate">{n.mensagem}</span>
            </div>
            <button
              onClick={() => dispensar(n.id)}
              className="flex-shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Marcar como lida"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
