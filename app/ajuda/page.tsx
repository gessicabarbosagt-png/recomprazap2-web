'use client'

import { useState } from 'react'
import { LayoutShell } from '@/components/app/layout-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MessageCircle, CalendarDays, FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AjudaPage() {
  const [suporteAberto, setSuporteAberto] = useState(false)

  return (
    <LayoutShell>
      <div className="max-w-xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Ajuda</h1>
          <p className="text-sm text-muted-foreground mt-1">Suporte e informações sobre o RecompraZap</p>
        </div>

        <div className="grid gap-4">
          {/* Suporte */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setSuporteAberto(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Suporte</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fale com nossa equipe pelo WhatsApp ou agende uma demonstração.
              </p>
            </CardContent>
          </Card>

          {/* Termos */}
          <Link href="/termos">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Termos de Uso</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Leia o Termo de Uso e Prestação de Serviço do RecompraZap.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Modal de Suporte */}
      <Dialog open={suporteAberto} onOpenChange={setSuporteAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como podemos ajudar?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <a
              href="https://wa.me/5511983202160"
              target="_blank"
              rel="noopener noreferrer"
            >
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

            <a
              href="https://calendly.com/gessicabarbosa-gt"
              target="_blank"
              rel="noopener noreferrer"
            >
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
    </LayoutShell>
  )
}
