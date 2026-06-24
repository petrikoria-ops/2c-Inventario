import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protege toda la app: sin sesión válida, redirige a /login.
// También refresca el token de sesión en cada request (requisito de
// @supabase/ssr para que la sesión no expire silenciosamente).
// Las rutas /api/* no se redirigen a una página HTML — si no hay sesión,
// RLS rechaza la consulta y la propia ruta devuelve su error JSON normal.
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

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApiRoute  = req.nextUrl.pathname.startsWith('/api/')

  if (!user && !isLoginPage && !isApiRoute) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-2c.png|.*\\.png$|.*\\.svg$).*)',
  ],
}
