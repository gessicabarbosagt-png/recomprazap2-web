import type { NextConfig } from "next";

// Stripe: integração via redirecionamento puro (window.location.href para Stripe Checkout
// Session URL retornada pelo backend) — sem loadStripe() nem js.stripe.com no frontend.
// A CSP não precisa mencionar domínios do Stripe.
//
// Fonte Inter: next/font/google baixa em build-time e self-hosta — sem request
// para fonts.googleapis.com em runtime, logo não precisa de font-src externo.
//
// 'unsafe-inline' em script-src e style-src: necessário para Next.js (inline scripts
// de hydration/__NEXT_DATA__ e style tags de CSS-in-JS). Eliminar exigiria nonces via
// middleware — deixar para uma etapa futura.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `connect-src 'self' https://api.recomprazap.com.br`,
  `img-src 'self' data:`,
  `font-src 'self'`,
  `frame-src 'none'`,
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
  // CSP enforcement ativo. Validado em produção (app.recomprazap.com.br).
  // Única violação detectada: Zod v4 `allowsEval()` — sonda `try { Function("") } catch { return false }`
  // no chunk de utilitários. O bloco é capturado pelo catch; Zod opera sem JIT. Nada quebra.
  // 'unsafe-eval' não é necessário: Turbopack só usa eval no dev server, nunca no prod build.
  { key: "Content-Security-Policy", value: csp },
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
