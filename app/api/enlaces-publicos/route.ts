import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar, getPerfil } from '@/lib/auth/permisos.server'
import { esModuloPublico, CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'
import { generarToken } from '@/lib/enlacesPublicos/token.server'

export const dynamic = 'force-dynamic'

// Lista los enlaces (activos e históricos) de un registro puntual —
// usado por CompartirEnlaceModal para mostrar/revocar los que ya existen.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modulo = searchParams.get('modulo')
  const registroId = searchParams.get('registro_id')
  if (!esModuloPublico(modulo) || !registroId) {
    return NextResponse.json({ error: 'Faltan parámetros.' }, { status: 400 })
  }

  const denegado = await requireModificar(CONFIG_MODULOS_PUBLICOS[modulo].permisoModulo)
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('enlaces_publicos')
    .select('*')
    .eq('modulo', modulo)
    .eq('registro_id', registroId)
    .order('creado_en', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { modulo, registro_id, expira_en, descripcion } = body

  if (!esModuloPublico(modulo)) return NextResponse.json({ error: 'Módulo no válido.' }, { status: 400 })
  if (!registro_id) return NextResponse.json({ error: 'Falta el registro a compartir.' }, { status: 400 })
  if (!expira_en) return NextResponse.json({ error: 'Elige una fecha de vencimiento para el enlace.' }, { status: 400 })

  const config = CONFIG_MODULOS_PUBLICOS[modulo]
  const denegado = await requireModificar(config.permisoModulo)
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()

  const { data: registro } = await sb.from(config.tabla).select('id').eq('id', registro_id).maybeSingle()
  if (!registro) return NextResponse.json({ error: 'El registro que quieres compartir no existe.' }, { status: 404 })

  let enlace: { id: number; token: string } | null = null
  let err: { message: string; code?: string } | null = null
  for (let i = 0; i < 3; i++) {
    const token = generarToken()
    const res = await sb
      .from('enlaces_publicos')
      .insert({
        token,
        modulo,
        registro_id,
        expira_en,
        descripcion: descripcion || null,
        creado_por: perfil?.id ?? null,
        creado_por_nombre: perfil?.nombre_completo ?? null,
      })
      .select('id, token')
      .single()
    if (!res.error) { enlace = res.data; err = null; break }
    err = res.error
    if (res.error.code !== '23505') break
  }

  if (err || !enlace) return NextResponse.json({ error: err?.message ?? 'No se pudo crear el enlace.' }, { status: 500 })
  return NextResponse.json(enlace, { status: 201 })
}
