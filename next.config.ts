import type { NextConfig } from "next";

// Domínios do Mercado Pago necessários para o SDK de cartão (cardForm / Bricks).
// O SDK injeta iframes e faz fetch para apis.mercadopago.com durante a tokenização.
// Fontes Inter: next/font/google baixa em build-time e self-hosta — não precisa
// de fonts.googleapis.com nem fonts.gstatic.com aqui.
const MP_SCRIPT    = "https://sdk.mercadopago.com";
const MP_FRAMES    = "https://*.mercadopago.com https://*.mlstatic.com";
const MP_CONNECT   = "https://api.mercadopago.com https://*.mercadopago.com";
const MP_IMAGES    = "https://*.mlstatic.com https://*.mercadopago.com";

// CSP em modo Report-Only: monitora violações sem bloquear nada.
// Trocar Content-Security-Policy-Report-Only por Content-Security-Policy
// após confirmar zero violações nos logs de produção.
//
// Diretivas comentadas que precisam de atenção antes de enforcement:
//   - script-src: Next.js pode precisar de 'unsafe-inline' p/ hydration (testar com nonce em v14+)
//   - style-src: MP cardForm injeta estilos inline → 'unsafe-inline' necessário
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${MP_SCRIPT}`,
  // unsafe-inline necessário porque o MP cardForm injeta <style> diretamente nos iframes
  `style-src 'self' 'unsafe-inline'`,
  `frame-src ${MP_FRAMES}`,
  `connect-src 'self' https://api.recomprazap.com.br ${MP_CONNECT}`,
  `img-src 'self' data: ${MP_IMAGES}`,
  `font-src 'self'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Report-Only: não bloqueia, apenas registra violações no console do browser.
  // Quando confirmar zero violações, mudar para Content-Security-Policy.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      {
        // Redireciona permanentemente qualquer rota da URL antiga para o domínio novo,
        // preservando o caminho completo (ex: /dashboard → app.recomprazap.com.br/dashboard).
        source: "/:path*",
        has: [{ type: "host", value: "recomprazap2-web.vercel.app" }],
        destination: "https://app.recomprazap.com.br/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
