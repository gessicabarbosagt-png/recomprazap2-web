'use client'

import { useEffect, useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { AdminGuard } from '@/components/app/admin-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { Store, WifiOff, Bell, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Saude {
  totalAtivas: number
  waDesconectados: number
  inadimplentes: number
  lembretesHoje: number
  lojasCriticas: Array<{
    id: string
    nome: string
    waStatus: string
    waAtualizadoEm: string | null
    statusAssinatura: string
  }>
}

function distancia(d: string | null) {
  if (!d) return 'nunca'
  return formatDistanceToNow(new Date(d), { locale: ptBR, addSuffix: true })
}

export default function AdminPage() {
  const [saude, setSaude] = useState<Saude | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/saude').then(r => setSaude(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <AdminGuard>
      <LayoutShell>
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-2xl font-semibold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema</p>
          </div>

          {/* Cards de saúde */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Store className="h-4 w-4" /> Lojas ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : (
                  <p className="text-3xl font-bold">{saude?.totalAtivas ?? 0}</p>
                )}
              </CardContent>
            </Card>

            <Card className={saude && saude.waDesconectados > 0 ? 'border-destructive' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <WifiOff className="h-4 w-4" /> WA desconectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : (
                  <p className={`text-3xl font-bold ${saude && saude.waDesconectados > 0 ? 'text-destructive' : ''}`}>
                    {saude?.waDesconectados ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Lembretes hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : (
                  <p className="text-3xl font-bold">{saude?.lembretesHoje ?? 0}</p>
                )}
              </CardContent>
            </Card>

            <Card className={saude && saude.inadimplentes > 0 ? 'border-yellow-500' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Inadimplentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : (
                  <p className={`text-3xl font-bold ${saude && saude.inadimplentes > 0 ? 'text-yellow-600' : ''}`}>
                    {saude?.inadimplentes ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lojas com problema */}
          {!loading && saude && saude.lojasCriticas.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">Lojas com atenção necessária</h2>
              <div className="space-y-2">
                {saude.lojasCriticas.map(loja => (
                  <Link key={loja.id} href={`/admin/lojas/${loja.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{loja.nome}</p>
                        {loja.waStatus === 'desconectado' && (
                          <p className="text-xs text-muted-foreground">
                            WA desconectado · {distancia(loja.waAtualizadoEm)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {loja.waStatus === 'desconectado' && (
                          <Badge variant="destructive">WA offline</Badge>
                        )}
                        {loja.statusAssinatura === 'inadimplente' && (
                          <Badge className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">Inadimplente</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && saude && saude.lojasCriticas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma loja com problemas no momento.</p>
          )}
        </div>
      </LayoutShell>
    </AdminGuard>
  )
}
