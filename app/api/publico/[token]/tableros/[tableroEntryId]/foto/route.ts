import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string; tableroEntryId: string } }

// Mismo path que lib/supabase/storage.ts → subirFotoAnexoSatTablero, para
// que una foto subida por acá y otra subida desde adentro de la app
// terminen en el mismo lugar (una sola foto general por tablero).
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.modulo !== 'verificacion_ric') {
    return NextResponse.json({ error: 'Este módulo no tiene Anexo SAT.' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const { data: tablero } = await sb
    .from('verificaciones_ric_tableros')
    .select('id')
    .eq('id', params.tableroEntryId)
    .eq('verificacion_id', enlace.registro_id)
    .maybeSingle()
  if (!tablero) return NextResponse.json({ error: 'Ese tablero no pertenece a este enlace.' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta la foto.' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${enlace.registro_id}/sat-${params.tableroEntryId}.${ext}`
  const { error: uploadError } = await sb.storage.from('verificaciones-ric').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: patchError } = await sb
    .from('verificaciones_ric_tableros')
    .update({ foto_url: path, foto_tomada: true })
    .eq('id', params.tableroEntryId)
  if (patchError) return NextResponse.json({ error: patchError.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json({ path })
}
