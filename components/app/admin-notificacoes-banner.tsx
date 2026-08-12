'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface Notificacao {
  id: string
  mensagem: string
  criadoEm: string
}

export function AdminNotificacoesBanner() {
  const { usuario } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])

  useEffect(() => {
    if (!usuario || usuario.role === 'admin') return
    api.get('/notificacoes')
      .then(({ data }) => setNotificacoes(data))
      .catch(() => {})
  }, [usuario])

  async function dispensar(id: string) {
    setNotificacoes(prev => prev.filter(n => n.id !== id))
    await api.patch(`/notificacoes/${id}/lida`).catch(() => {})
  }

  if (notificacoes.length === 0) return null

  return (
    <div className="space-y-px">
      {notificacoes.map(n => (
        <div
          key={n.id}
          className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200 text-blue-900 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="h-4 w-4 flex-shrink-0 text-blue-600" />
            <span className="truncate">{n.mensagem}</span>
          </div>
          <button
            onClick={() => dispensar(n.id)}
            className="flex-shrink-0 rounded p-0.5 hover:bg-blue-200 transition-colors"
            aria-label="Marcar como lida"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
