'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  role: string
  loja: { id: string; nome: string } | null
}

interface AuthContextType {
  usuario: Usuario | null
  login: (usuario: Usuario) => void
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verifica sessão ativa consultando o backend (cookie HttpOnly é enviado automaticamente).
    // 401 = sem sessão válida → estado permanece null, AuthGuard redireciona para /login.
    api.get<Usuario>('/auth/me')
      .then(({ data }) => setUsuario(data))
      .catch(() => setUsuario(null))
      .finally(() => setLoading(false))
  }, [])

  function login(u: Usuario) {
    setUsuario(u)
    router.push(u.role === 'admin' ? '/admin' : '/dashboard')
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    sessionStorage.removeItem('wa_banner_dismissed')
    setUsuario(null)
    router.push('/login')
  }

  // Atualiza o estado do usuário buscando dados frescos do servidor.
  // Usar após mudanças de perfil (nome, email, loja) para manter a UI sincronizada.
  async function refreshMe() {
    const { data } = await api.get<Usuario>('/auth/me')
    setUsuario(data)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, refreshMe, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
