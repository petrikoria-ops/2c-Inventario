import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

// PATCH /api/mensajes/marcar-leidos — marca como leídos todos los mensajes
// de una conversación dirigidos a mí que sigan sin leer. Se llama al abrir
// el hilo (panel deslizante o /mensajes).
export async function PATCH(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const body = await req.json()
  const remitente_id = body.remitente_id as string | undefined
  if (!remitente_id) return NextResponse.json({ error: 'Falta remitente_id.' }, { status: 400 })

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('mensajes')
    .update({ leido_en: new Date().toISOString() })
    .eq('destinatario_id', perfil.id)
    .eq('remitente_id', remitente_id)
    .is('leido_en', null)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ marcados: data?.length ?? 0 })
}
