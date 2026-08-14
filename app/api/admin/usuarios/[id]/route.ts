import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const CAMPOS_PERMITIDOS = [
  'departamento', 'puesto', 'nivel_acceso', 'activo',
  'sec_licencia_numero', 'sec_licencia_clase', 'sec_licencia_vencimiento',
] as const

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

  // Nadie puede cambiar su propio nivel de acceso ni su propio estado
  // activo/inactivo — evita que un admin se bloquee o se auto-escale sin
  // que otro lo apruebe. Comparar contra el valor actual (no solo la
  // presencia del campo) para no romper la edición normal de
  // departamento/puesto, que el formulario envía junto al resto.
  if (params.id === perfil.id) {
    if ('activo' in fields && fields.activo !== perfil.activo) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio estado de cuenta.' }, { status: 400 })
    }
    if ('nivel_acceso' in fields && fields.nivel_acceso !== perfil.nivel_acceso) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio nivel de acceso.' }, { status: 400 })
    }
  }

  // "master" es el nivel de mayor privilegio del sistema — solo alguien que
  // ya es master puede otorgarlo, para que no quede a un clic de cualquier
  // admin_software.
  if (fields.nivel_acceso === 'master' && perfil.nivel_acceso !== 'master') {
    return NextResponse.json({ error: 'Solo un usuario master puede asignar el nivel master.' }, { status: 403 })
  }

  const sb = getSupabaseServer()
  const { error } = await sb.from('perfiles').update(fields).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Desactivar debe revocar el acceso real, no solo la fila en `perfiles`
  // (getPerfil() ya filtra por activo=true, pero una sesión ya emitida
  // sigue siendo válida ante Supabase Auth hasta que se banee la cuenta).
  if (fields.activo === false || fields.activo === true) {
    const admin = getSupabaseAdmin()
    const { error: errBan } = await admin.auth.admin.updateUserById(params.id, {
      ban_duration: fields.activo === false ? '876000h' : 'none',
    })
    if (errBan) return NextResponse.json({ error: `Perfil actualizado, pero falló revocar el acceso: ${errBan.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
