import axios from 'axios'

// Em produção, definir NEXT_PUBLIC_API_URL=https://api.recomprazap.com.br no Railway/Vercel.
// Em desenvolvimento local, aponta para http://localhost:3000/api/v1.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  // Envia cookies automaticamente em requests cross-origin (obrigatório para o cookie HttpOnly)
  withCredentials: true,
  headers: {
    // Header customizado exigido pelo CsrfGuard no backend para requests autenticados.
    // Browsers não enviam headers customizados cross-origin sem CORS approval,
    // portanto isso bloqueia ataques CSRF de sites terceiros.
    'X-Requested-With': 'XMLHttpRequest',
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Evita loop de redirecionamento se o próprio /login retornar 401
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
