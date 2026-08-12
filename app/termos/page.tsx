'use client'

import Link from 'next/link'
import { LayoutShell } from '@/components/app/layout-shell'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermosPage() {
  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/ajuda">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Termo de Uso</h1>
            <p className="text-sm text-muted-foreground mt-0.5">RecompraZap — BeeUp Marketing</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground text-sm">
            Este documento estabelece as condições de uso da plataforma RecompraZap, prestada por{' '}
            <strong>BeeUp Marketing</strong> ("BeeUp", "nós") à loja contratante ("Cliente"). Ao contratar o serviço, o
            Cliente declara ter lido e concordado com os termos abaixo.
          </p>

          <section>
            <h2 className="text-base font-semibold mb-2">1. O que é o serviço</h2>
            <p className="text-sm text-muted-foreground">
              O RecompraZap é uma plataforma que automatiza o envio de lembretes de recompra via WhatsApp para os
              clientes do Cliente, além de organizar as respostas recebidas, o histórico de pedidos e vendas em um painel
              de gestão. O serviço utiliza o número de WhatsApp do próprio Cliente, conectado à plataforma pelo Cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. Responsabilidade sobre o WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              O WhatsApp é uma plataforma de terceiros (Meta) e não pertence nem é operada pela BeeUp. A BeeUp não
              garante disponibilidade, estabilidade ou funcionamento contínuo do WhatsApp, e não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Bloqueios, banimentos, suspensões ou limitações aplicadas pelo WhatsApp ao número do Cliente;</li>
              <li>Mudanças técnicas ou de política da Meta que afetem o funcionamento do serviço;</li>
              <li>Perda de mensagens, atrasos de entrega ou instabilidades causadas pelo WhatsApp.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              O Cliente é responsável por usar o número conectado de forma adequada, evitando envio de mensagens em
              volume ou frequência que possam ser interpretadas como spam pela Meta. A BeeUp orienta boas práticas de
              uso, mas a decisão final e o risco de uso do número são do Cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              O valor da mensalidade e a data de vencimento são acordados individualmente com cada Cliente e informados
              no ato da contratação. O pagamento é processado por fora da plataforma (ex: Pix), conforme combinado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Em caso de atraso no pagamento, a BeeUp enviará avisos diários ao Cliente. Caso o pagamento não seja
              regularizado, o acesso à plataforma poderá ser suspenso até a quitação do valor devido, sem prejuízo dos
              lembretes e mensagens já processados até o momento da suspensão.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. Cancelamento e fidelidade</h2>
            <p className="text-sm text-muted-foreground">
              O plano padrão possui fidelidade mínima de 6 (seis) meses a partir da data de contratação. Prazos de
              fidelidade menores, ou a contratação sem fidelidade, podem ser negociados e acordados por escrito antes do
              início do serviço.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Independentemente da fidelidade contratada, o cancelamento deve ser solicitado com no mínimo 30 (trinta)
              dias de antecedência à data desejada de encerramento, por escrito (WhatsApp, e-mail ou outro meio
              combinado). Cancelamentos solicitados antes do fim do período de fidelidade poderão estar sujeitos a
              cobrança proporcional ao período restante, conforme acordado na contratação.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. Dados dos clientes do Cliente</h2>
            <p className="text-sm text-muted-foreground">
              O Cliente é responsável por garantir que possui base legal (LGPD) para o tratamento dos dados de contato
              de seus próprios clientes cadastrados na plataforma, incluindo, quando aplicável, o consentimento para o
              recebimento de mensagens via WhatsApp.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A BeeUp trata esses dados exclusivamente para a prestação do serviço contratado, não os compartilha com
              terceiros para fins alheios ao RecompraZap, e adota medidas razoáveis de segurança para protegê-los.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. Limitação de responsabilidade</h2>
            <p className="text-sm text-muted-foreground">
              A BeeUp se compromete a manter a plataforma em funcionamento e a corrigir falhas técnicas identificadas
              dentro de prazo razoável. A BeeUp não se responsabiliza por perdas de faturamento, oportunidades
              comerciais ou danos indiretos decorrentes de indisponibilidade temporária do serviço, falhas do
              WhatsApp/Meta, ou uso inadequado da plataforma pelo Cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">7. Alterações neste termo</h2>
            <p className="text-sm text-muted-foreground">
              Este termo pode ser atualizado pela BeeUp para refletir melhorias ou mudanças no serviço. Alterações
              relevantes serão comunicadas ao Cliente com antecedência razoável.
            </p>
          </section>

          <div className="border-t pt-4 mt-6 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">BeeUp Marketing</p>
            <div className="flex gap-16 mt-3">
              <div>
                <p>Prestadora</p>
              </div>
              <div>
                <p>Cliente</p>
                <p className="mt-4">Nome da loja / responsável</p>
                <p className="mt-4">Data: ____ / ____ / ________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  )
}
