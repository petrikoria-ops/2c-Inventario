import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protege la navegación de páginas: sin sesión válida, redirige a /login.
// La seguridad real la hace RLS en Supabase (auth.role()='authenticated'),
// no este middleware — esto es solo para mostrar /login en vez de una
// página rota. Por eso:
//   - Las rutas /api/* no pasan por aquí en absoluto: no redirigen nunca
//     y RLS ya las protege a nivel de datos; revisar la sesión ahí era
//     una llamada de red a Supabase Auth por cada fetch, sin ningún uso.
//   - Para páginas se usa getSession() (lee la cookie local, sin red) en
//     vez de getUser() (que sí pega a la red en cada request) — más rápido,
//     y no baja la seguridad real porque esa la sigue dando RLS.

// Cookie que recuerda que este usuario ya pasó la comprobación de perfil,
// para no repetir esa consulta a Supabase en cada navegación (ver abajo).
const PERFIL_OK_COOKIE = 'perfil_verificado'
const PERFIL_OK_TTL = 60 * 30 // 30 minutos

function nuevaUrl(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return url
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  // /crear-password también es pública: el link del correo de invitación
  // llega sin sesión (los tokens vienen en la URL) — la sesión recién se
  // arma en el navegador cuando esa página carga y procesa el código.
  // /completar/[token] es el enlace público que se manda a alguien ajeno a
  // la app para que llene/firme una verificación — llega sin sesión, y su
  // control de acceso es el token (ver lib/enlacesPublicos/token.server.ts),
  // no esta cookie de sesión.
  const isPublicPage =
    path === '/login' ||
    path === '/solicitar-acceso' ||
    path === '/crear-password' ||
    path === '/auth/callback' ||
    path.startsWith('/completar/')

  const isPendingPage = path === '/pendiente-aprobacion'

  // BUG CRÍTICO corregido: esta rama faltaba por completo. Sin ella, un
  // request sin sesión a una página protegida no caía en ninguno de los
  // `if (session && ...)` de abajo y seguía de largo con `return res` — es
  // decir, cualquiera con un link directo a una página protegida entraba
  // sin pasar por /login. RLS igual bloqueaba los datos, pero el shell de
  // la app (sidebar, layout) se renderizaba igual. Sin sesión, a cualquier
  // página no pública, siempre a /login.
  if (!session && !isPublicPage) {
    return NextResponse.redirect(nuevaUrl(req, '/login'))
  }

  if (session && isPublicPage && path !== '/crear-password' && path !== '/auth/callback' && !path.startsWith('/completar/')) {
    return NextResponse.redirect(nuevaUrl(req, '/'))
  }

  // Con sesión, pero todavía sin perfil asignado (cuenta recién invitada,
  // o de un usuario creado antes de que existiera este sistema de roles):
  // se le confina a /pendiente-aprobacion en vez de dejarlo ver páginas
  // rotas o sin datos por culpa de RLS.
  //
  // PERFORMANCE: esta comprobación es un round-trip a Supabase, y el
  // middleware corre en TODAS las navegaciones — incluidos los requests RSC
  // que dispara cada <Link> del menú lateral. Era un viaje a la base de
  // datos atravesado en el camino crítico de cada cambio de pestaña,
  // siempre para responder lo mismo: "sí, este usuario tiene perfil".
  //
  // Se memoriza el resultado en una cookie que lleva el id del usuario
  // dentro: si coincide con la sesión actual, ya sabemos que el perfil
  // existe y nos saltamos la consulta. Va con el id (no un simple "1") para
  // que al cambiar de cuenta en el mismo navegador no se herede la
  // respuesta de la anterior. Solo se cachea el caso positivo: al usuario
  // sin perfil se le sigue comprobando en cada request, así entra apenas
  // se le aprueba, sin esperar a que expire nada.
  //
  // Esto no relaja la seguridad: quién puede leer qué lo sigue decidiendo
  // RLS en Supabase con el JWT de cada consulta, no esta cookie.
  if (session && !isPublicPage) {
    const yaVerificado = req.cookies.get(PERFIL_OK_COOKIE)?.value === session.user.id

    if (!yaVerificado) {
      const { data: perfil } = await supabase
        .from('perfiles').select('id').eq('id', session.user.id).maybeSingle()

      if (!perfil) {
        return isPendingPage ? res : NextResponse.redirect(nuevaUrl(req, '/pendiente-aprobacion'))
      }

      // Perfil confirmado: se anota en la cookie para no repetir la consulta
      // en las próximas navegaciones.
      const destino = isPendingPage ? NextResponse.redirect(nuevaUrl(req, '/')) : res
      destino.cookies.set(PERFIL_OK_COOKIE, session.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: PERFIL_OK_TTL,
      })
      return destino
    }

    if (isPendingPage) return NextResponse.redirect(nuevaUrl(req, '/'))
  }

  return res
}

export const config = {
  matcher: [
    // /terreno/ son herramientas de terreno estáticas (public/terreno/*.html), públicas y sin sesión.
    '/((?!api/|terreno/|_next/static|_next/image|favicon.ico|logo-2c.png|.*\.png$|.*\.svg$).*)',
  ],
}
