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
  const isPublicPage  = path === '/login' || path === '/solicitar-acceso'
  const isPendingPage = path === '/pendiente-aprobacion'

  if (!session && !isPublicPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Con sesión, pero todavía sin perfil asignado (cuenta recién invitada,
  // o de un usuario creado antes de que existiera este sistema de roles):
  // se le confina a /pendiente-aprobacion en vez de dejarlo ver páginas
  // rotas o sin datos por culpa de RLS.
  if (session && !isPublicPage) {
    const { data: perfil } = await supabase
      .from('perfiles').select('id').eq('id', session.user.id).maybeSingle()

    if (!perfil && !isPendingPage) {
      const url = req.nextUrl.clone()
      url.pathname = '/pendiente-aprobacion'
      url.search = ''
      return NextResponse.redirect(url)
    }
    if (perfil && isPendingPage) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (session && isPublicPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|logo-2c.png|.*\\.png$|.*\\.svg$).*)',
  ],
}
