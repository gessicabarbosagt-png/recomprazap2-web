'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, MessageCircle, CheckCircle2, ArrowRight, WifiOff } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [waConectado, setWaConectado] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/onboarding/checklist').catch(() => null),
      api.get('/whatsapp/status').catch(() => null),
    ]).then(([checklist, wa]) => {
      if (checklist?.data?.testEnviado) setEnviado(true)
      setWaConectado(wa?.data?.status === 'conectado')
    }).finally(() => setVerificando(false))
  }, [])

  async function handleEnviar() {
    if (!telefone.trim()) return toast.error('Digite seu número de WhatsApp')
    setEnviando(true)
    try {
      await api.post('/onboarding/enviar-teste', { telefone: telefone.trim() })
      setEnviado(true)
      toast.success('Lembrete de teste enviado!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar. Verifique se o WhatsApp está conectado.')
    } finally {
      setEnviando(false)
    }
  }

  if (verificando) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </LayoutShell>
    )
  }

  return (
    <LayoutShell>
      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Veja como funciona</h1>
          <p className="text-muted-foreground text-sm">
            Envie um lembrete de teste para qualquer número de WhatsApp — inclusive o seu próprio — e veja exatamente como seus clientes recebem os avisos.
          </p>
        </div>

        {!waConectado ? (
          /* ── WhatsApp não conectado ─────────────────────────────── */
          <Card className="border-2 border-orange-200 dark:border-orange-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-orange-500 shrink-0" />
                <CardTitle className="text-base">Primeiro, conecte o WhatsApp da sua loja</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para enviar lembretes, o WhatsApp da sua loja precisa estar conectado. É rápido — basta escanear um QR Code pelo seu celular.
              </p>
              <Button className="w-full" asChild>
                <Link href="/configuracoes">
                  Conectar WhatsApp agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Após conectar, volte aqui para enviar o teste.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* ── WhatsApp conectado — mostrar formulário ──────────── */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {enviado ? 'Lembrete enviado com sucesso!' : 'Enviar lembrete de teste'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enviado ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      A mensagem foi enviada. Verifique o WhatsApp — é exatamente assim que seus clientes vão receber os lembretes.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEnviado(false)}
                    >
                      Enviar novamente
                    </Button>
                    <Button className="flex-1" onClick={() => router.push('/dashboard')}>
                      Ir para o Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Número de WhatsApp para o teste</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pode ser o seu próprio celular. Com DDD, sem o +55. Ex: 11 98765-4321
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleEnviar} disabled={enviando}>
                    {enviando
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                      : <><MessageCircle className="mr-2 h-4 w-4" />Enviar lembrete de teste</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            ← Voltar para o Dashboard
          </Link>
        </p>
      </div>
    </LayoutShell>
  )
}
