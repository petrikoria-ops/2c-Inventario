import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import { VER_COMO_COOKIE, DEPARTAMENTOS_OPERATIVOS, esAdminTotal } from '@/lib/auth/verComo'
import type { Departamento } from '@/lib/auth/permisos.server'

// POST { depto: Departamento | null }
//  - Guarda el departamento a "ver como" en una cookie (solo master / admin_software).
//  - depto null / 'real' → vuelve a la vista propia (borra la cookie).
export async function POST(req: Request) {
  const perfil = await getPerfil()
  if (!esAdminTotal(perfil)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let depto: string | null = null
  try {
    const body = await req.json()
    depto = body?.depto ?? null
  } catch {
    depto = null
  }

  const jar = cookies()
  if (!depto || depto === 'real') {
    jar.delete(VER_COMO_COOKIE)
    return NextResponse.json({ ok: true, verComo: null })
  }

  if (!DEPARTAMENTOS_OPERATIVOS.includes(depto as Departamento)) {
    return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 })
  }

  jar.set(VER_COMO_COOKIE, depto, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8h — sesión de trabajo; luego vuelve solo a su vista
  })
  return NextResponse.json({ ok: true, verComo: depto })
}
