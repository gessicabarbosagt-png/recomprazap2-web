'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MessageCircle, CalendarDays, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [suporteAberto, setSuporteAberto] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, senha })
      login(data.accessToken, data.usuario)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao fazer login'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-3xl mb-1">♻️</div>
          <CardTitle className="text-2xl">RecompraZap</CardTitle>
          <CardDescription>Entre no painel do lojista</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setSuporteAberto(true)}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
            Foi desconectado sem motivo aparente? Isso pode acontecer por segurança.{' '}
            Redefina sua senha acima ou{' '}
            <a
              href="https://wa.me/5511983202160"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground/90 transition-colors"
            >
              fale com o suporte
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Dialog open={suporteAberto} onOpenChange={setSuporteAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como podemos ajudar?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <a href="https://wa.me/5511983202160" target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Falar no WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Resposta rápida</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </a>

            <a href="https://calendly.com/gessicabarbosa-gt" target="_blank" rel="noopener noreferrer">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Agendar demonstração</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conheça mais</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
