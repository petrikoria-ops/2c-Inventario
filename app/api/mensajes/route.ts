import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

// GET /api/mensajes?con=<perfilId> — historial completo de la conversación
// entre el perfil logueado y `con`, en ambos sentidos.
export async function GET(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const con = searchParams.get('con')
  if (!con) return NextResponse.json({ error: 'Falta el parámetro con.' }, { status: 400 })

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('mensajes')
    .select('*')
    .or(`and(remitente_id.eq.${perfil.id},destinatario_id.eq.${con}),and(remitente_id.eq.${con},destinatario_id.eq.${perfil.id})`)
    .order('creado_en', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/mensajes — envía un mensaje. No hay permiso de módulo que
// exigir acá (mensajería es transversal, ver docs del plan) — la única
// condición es tener sesión.
export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const body = await req.json()
  const destinatario_id = body.destinatario_id as string | undefined
  const contenido = String(body.contenido ?? '').trim()
  if (!destinatario_id || !contenido) {
    return NextResponse.json({ error: 'Falta destinatario o contenido.' }, { status: 400 })
  }

  const sb = getSupabaseServer()

  // La RLS de `perfiles` no deja hacer SELECT de la fila de otra persona
  // salvo que seas admin — se usa el directorio (SECURITY DEFINER) para
  // confirmar que el destinatario existe y está activo.
  const { data: directorio, error: dirErr } = await sb.rpc('perfiles_directorio')
  if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 })
  if (!directorio?.some((p: { id: string }) => p.id === destinatario_id)) {
    return NextResponse.json({ error: 'El destinatario no existe o no está activo.' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('mensajes')
    .insert({ remitente_id: perfil.id, destinatario_id, contenido })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
