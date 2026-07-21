'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!usuario) {
        router.replace('/login')
      } else if (usuario.role !== 'admin') {
        router.replace('/dashboard')
      }
    }
  }, [loading, usuario, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!usuario || usuario.role !== 'admin') return null

  return <>{children}</>
}
