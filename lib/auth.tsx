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
        // JWT é a fonte autoritativa para role — cobre localStorage stale
        // de logins feitos antes de o campo role existir na resposta da API.
        const jwtPayload = JSON.parse(atob(t.split('.')[1]))
        if (jwtPayload.role) storedUser.role = jwtPayload.role
        // Persiste a correção para não depender do JWT a cada reload
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
