'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'

export default function RedefinirSenhaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!token) setErro('Link inválido. Solicite um novo link de redefinição.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha })
      setSucesso(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao redefinir senha.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-base">Senha definida com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecionando para o login…</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-3xl mb-1">♻️</div>
          <CardTitle className="text-xl">
            {token ? 'Definir nova senha' : 'Link inválido'}
          </CardTitle>
          {token && (
            <CardDescription>Escolha uma senha com pelo menos 6 caracteres</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!token || erro === 'Link inválido. Solicite um novo link de redefinição.' ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive text-center">{erro}</p>
              <Link href="/esqueci-senha">
                <Button variant="outline" className="w-full">Solicitar novo link</Button>
              </Link>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmar">Confirmar senha</Label>
                  <Input
                    id="confirmar"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                  />
                </div>
                {erro && (
                  <p className="text-sm text-destructive">{erro}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar nova senha
                </Button>
              </form>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="inline h-3 w-3 mr-1" />
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
