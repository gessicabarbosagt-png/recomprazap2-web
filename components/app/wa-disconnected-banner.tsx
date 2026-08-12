'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const STORAGE_KEY = 'wa_banner_dismissed'

export function WaDisconnectedBanner() {
  const { usuario } = useAuth()
  const [desconectado, setDesconectado] = useState(false)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    if (!usuario || usuario.role === 'admin') return
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      setDispensado(true)
      return
    }
    api.get('/lojas/minha')
      .then(({ data }) => {
        if (data.waStatus === 'desconectado' || data.wa_status === 'desconectado') {
          setDesconectado(true)
        }
      })
      .catch(() => {})
  }, [usuario])

  function dispensar() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDispensado(true)
  }

  if (!desconectado || dispensado) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <span className="truncate">
          Seu WhatsApp está desconectado — lembretes não estão sendo enviados.{' '}
          <Link href="/configuracoes" className="font-semibold underline underline-offset-2 hover:text-amber-700">
            Ir para Configurações para reconectar
          </Link>
        </span>
      </div>
      <button
        onClick={dispensar}
        className="flex-shrink-0 rounded p-0.5 hover:bg-amber-200 transition-colors"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
