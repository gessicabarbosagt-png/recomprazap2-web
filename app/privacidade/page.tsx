'use client'

import Link from 'next/link'
import { LayoutShell } from '@/components/app/layout-shell'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacidadePage() {
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
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground mt-0.5">RecompraZap — Versão 1 — Agosto de 2026</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground text-sm">
            Esta Política de Privacidade descreve como <strong>Géssica Barbosa dos Santos</strong>, inscrita no CNPJ
            sob o nº 48.642.472/0001-74, na qualidade de operadora e controladora de dados da plataforma RecompraZap
            ("RecompraZap", "nós"), coleta, usa, armazena e protege dados pessoais no âmbito da prestação do serviço,
            em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <section>
            <h2 className="text-base font-semibold mb-2">1. Quem somos e a quem esta política se aplica</h2>
            <p className="text-sm text-muted-foreground">
              Esta política se aplica a dois grupos de pessoas: (a) o lojista que contrata o RecompraZap ("Cliente") e
              seus usuários cadastrados no painel; e (b) os clientes finais do Cliente, cujos contatos são cadastrados
              na plataforma para o envio de lembretes de recompra ("Contatos").
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. Dados que coletamos</h2>
            <p className="text-sm text-muted-foreground font-medium mt-2">2.1 Do Cliente (lojista)</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
              <li>Nome, e-mail e senha de acesso (armazenada de forma criptografada, nunca em texto puro)</li>
              <li>Nome e dados da loja</li>
              <li>
                Dados de pagamento processados pelo Mercado Pago — nunca armazenamos número completo de cartão; apenas
                um token de pagamento e os últimos 4 dígitos
              </li>
              <li>Número de WhatsApp conectado à plataforma</li>
            </ul>
            <p className="text-sm text-muted-foreground font-medium mt-3">2.2 Dos Contatos (clientes do Cliente)</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
              <li>Nome e número de telefone/WhatsApp</li>
              <li>Histórico de mensagens trocadas com a loja através da plataforma</li>
              <li>Histórico de pedidos e valores de compra, quando informados pelo Cliente</li>
              <li>Origem do contato (ex: indicação, Instagram, anúncio), quando identificável</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. Finalidade do tratamento</h2>
            <p className="text-sm text-muted-foreground">
              Os dados são utilizados exclusivamente para: operar o serviço de lembretes automáticos de recompra;
              permitir que o Cliente gerencie sua base de clientes e histórico de vendas; processar pagamentos da
              assinatura; enviar comunicações operacionais (ex: aviso de desconexão do WhatsApp, confirmação de
              pagamento); e cumprir obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. Base legal</h2>
            <p className="text-sm text-muted-foreground">
              O tratamento dos dados do Cliente ocorre com base na execução do contrato de prestação de serviço (art.
              7º, V, LGPD). O tratamento dos dados dos Contatos é de responsabilidade do Cliente, que deve possuir base
              legal própria (execução de contrato, consentimento, ou legítimo interesse, conforme aplicável) para
              cadastrar esses dados na plataforma e para o envio de mensagens via WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. Compartilhamento de dados</h2>
            <p className="text-sm text-muted-foreground">
              Compartilhamos dados apenas com os prestadores de serviço estritamente necessários para a operação da
              plataforma:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Mercado Pago — processamento de pagamentos</li>
              <li>Meta/WhatsApp — envio e recebimento de mensagens, conforme o número conectado pelo Cliente</li>
              <li>Provedor de e-mail transacional — envio de e-mails operacionais (ex: redefinição de senha, avisos)</li>
              <li>
                Meta Ads (Conversions API) — exclusivamente quando o Cliente ativa essa integração e configura suas
                próprias credenciais
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing ou
              publicidade não relacionados ao RecompraZap.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. Armazenamento e segurança</h2>
            <p className="text-sm text-muted-foreground">
              Os dados são armazenados em servidores localizados fora do Brasil, operados por provedores de
              infraestrutura em nuvem com práticas reconhecidas de segurança. Adotamos medidas técnicas de proteção,
              incluindo: senhas armazenadas com hash criptográfico; conexões criptografadas (HTTPS); controle de acesso
              por autenticação; segregação de dados entre lojas clientes; e registro de auditoria de ações
              administrativas sensíveis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">7. Retenção e exclusão</h2>
            <p className="text-sm text-muted-foreground">
              Os dados são mantidos enquanto durar o contrato com o Cliente e pelo prazo adicional necessário para
              cumprimento de obrigações legais, fiscais ou regulatórias. Após o cancelamento da conta, os dados podem
              ser mantidos por período limitado antes da exclusão definitiva, para viabilizar eventual reativação
              solicitada pelo Cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">8. Direitos do titular</h2>
            <p className="text-sm text-muted-foreground">
              Nos termos da LGPD, o titular dos dados pode solicitar, a qualquer momento: confirmação da existência de
              tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização,
              bloqueio ou eliminação de dados desnecessários; portabilidade dos dados; eliminação dos dados tratados com
              consentimento; e informação sobre o compartilhamento de dados com terceiros.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Solicitações podem ser feitas pelo e-mail de contato indicado na seção 10, ou, para o Cliente, diretamente
              pelo painel — na aba "Perfil", em Configurações, onde é possível editar dados cadastrais e solicitar a
              exclusão da conta.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">9. Cancelamento simples</h2>
            <p className="text-sm text-muted-foreground">
              O Cliente pode cancelar sua assinatura a qualquer momento diretamente pela seção "Meu Plano" do painel,
              ou solicitando por e-mail/WhatsApp, observado o prazo de aviso prévio previsto no Termo de Uso. Não há
              burocracia adicional ou formulário extenso para o cancelamento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">10. Encarregado de dados (DPO) e contato</h2>
            <p className="text-sm text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato pelo e-mail
              informado no painel ou pelo WhatsApp de suporte disponível na Central de Ajuda.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">11. Alterações desta política</h2>
            <p className="text-sm text-muted-foreground">
              Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas ao Cliente com
              antecedência razoável, por e-mail ou aviso no painel.
            </p>
          </section>
        </div>
      </div>
    </LayoutShell>
  )
}
