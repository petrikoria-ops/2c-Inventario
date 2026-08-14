import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPerfil, PUESTOS_POR_DEPARTAMENTO } from '@/lib/auth/permisos.server'
import { VER_COMO_COOKIE, VER_COMO_PUESTO_COOKIE, DEPARTAMENTOS_OPERATIVOS, esAdminTotal } from '@/lib/auth/verComo'
import type { Departamento } from '@/lib/auth/permisos.server'

// POST { depto: Departamento | null, puesto?: string | null }
//  - Guarda el departamento (y opcionalmente el puesto específico dentro de
//    él) a "ver como" en cookies (solo master / admin_software).
//  - depto null / 'real' → vuelve a la vista propia (borra ambas cookies).
//  - puesto ausente/null → simula el puesto representativo (jefe) del área,
//    igual que antes de que existiera esta opción.
const cookieOpts = {
  path: '/', sameSite: 'lax' as const, httpOnly: true,
  maxAge: 60 * 60 * 8, // 8h — sesión de trabajo; luego vuelve solo a su vista
}

export async function POST(req: Request) {
  const perfil = await getPerfil()
  if (!esAdminTotal(perfil)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let depto: string | null = null
  let puesto: string | null = null
  try {
    const body = await req.json()
    depto = body?.depto ?? null
    puesto = body?.puesto ?? null
  } catch {
    depto = null
  }

  const jar = cookies()
  if (!depto || depto === 'real') {
    jar.delete(VER_COMO_COOKIE)
    jar.delete(VER_COMO_PUESTO_COOKIE)
    return NextResponse.json({ ok: true, verComo: null, verComoPuesto: null })
  }

  if (!DEPARTAMENTOS_OPERATIVOS.includes(depto as Departamento)) {
    return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 })
  }

  jar.set(VER_COMO_COOKIE, depto, cookieOpts)

  if (puesto && PUESTOS_POR_DEPARTAMENTO[depto as Departamento].some(p => p.puesto === puesto)) {
    jar.set(VER_COMO_PUESTO_COOKIE, puesto, cookieOpts)
  } else {
    jar.delete(VER_COMO_PUESTO_COOKIE)
    puesto = null
  }

  return NextResponse.json({ ok: true, verComo: depto, verComoPuesto: puesto })
}
