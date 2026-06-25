import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const CAMPOS_PERMITIDOS = ['departamento', 'puesto', 'nivel_acceso', 'activo'] as const

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = await req.json()
  const fields: Record<string, unknown> = {}
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in body) fields[campo] = body[campo]
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 })
  }

  // Nadie puede desactivarse a sí mismo — evita que un admin se bloquee
  // por error y se quede sin nadie con acceso para revertirlo.
  if (params.id === perfil.id && fields.activo === false) {
    return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta.' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { error } = await sb.from('perfiles').update(fields).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
