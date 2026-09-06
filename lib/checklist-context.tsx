'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'

export interface Checklist {
  waConectado: boolean
  testEnviado: boolean
  produtosSuficientes: boolean
  clientesSuficientes: boolean
  pagamentoConfigurado: boolean
  completo: boolean
}

export const CHECKLIST_ITENS: {
  key: keyof Omit<Checklist, 'completo'>
  label: string
  href: string
}[] = [
  { key: 'waConectado',          label: 'Conecte seu WhatsApp',                                                   href: '/configuracoes' },
  { key: 'testEnviado',          label: 'Envie seu lembrete de teste',                                            href: '/onboarding' },
  { key: 'produtosSuficientes',  label: 'Adicione mais produtos com ciclo de recompra',                           href: '/produtos' },
  { key: 'clientesSuficientes',  label: 'Cadastre seus primeiros clientes (um por um ou importando uma planilha)', href: '/clientes' },
  { key: 'pagamentoConfigurado', label: 'Adicione uma forma de pagamento',                                        href: '/plano' },
]

interface ChecklistContextType {
  checklist: Checklist | null
  refetch: () => void
}

const ChecklistContext = createContext<ChecklistContextType>({
  checklist: null,
  refetch: () => {},
})

export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const pathname = usePathname()
  const completoRef = useRef(false)

  const refetch = useCallback(() => {
    api.get('/onboarding/checklist')
      .then(r => {
        setChecklist(r.data)
        completoRef.current = Boolean(r.data?.completo)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Não refetch se já completo — evita chamadas desnecessárias
    if (completoRef.current) return
    refetch()
  }, [pathname, refetch])

  return (
    <ChecklistContext.Provider value={{ checklist, refetch }}>
      {children}
    </ChecklistContext.Provider>
  )
}

export function useChecklist() {
  return useContext(ChecklistContext)
}
