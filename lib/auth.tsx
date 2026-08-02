'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

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
  token: string | null
  login: (token: string, usuario: Usuario) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('usuario')
    if (t && u) {
      try {
        const storedUser: Usuario = JSON.parse(u)
        const jwtPayload = JSON.parse(atob(t.split('.')[1]))
        // Deriva role em ordem de precedência:
        // 1) JWT novo → campo role explícito
        // 2) JWT antigo → perfil:'dono' era o equivalente de admin
        // 3) localStorage stale → mesma lógica via perfil gravado
        // Cobre logins feitos antes de o campo role existir na API.
        storedUser.role =
          jwtPayload.role ??
          (jwtPayload.perfil === 'dono' ? 'admin' : null) ??
          (storedUser.perfil === 'dono' ? 'admin' : null) ??
          'lojista'
        localStorage.setItem('usuario', JSON.stringify(storedUser))
        setToken(t)
        setUsuario(storedUser)
      } catch {
        setToken(t)
        setUsuario(JSON.parse(u))
      }
    }
    setLoading(false)
  }, [])

  function login(token: string, usuario: Usuario) {
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    setToken(token)
    setUsuario(usuario)
    router.push(usuario.role === 'admin' ? '/admin' : '/dashboard')
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
