import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'
import { CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

// Sube la foto de evidencia de un ítem. Va por acá (no directo del navegador
// a Storage, como hace FotoUpload.tsx para usuarios con sesión) porque las
// policies de Storage exigen `authenticated` — quien llena por enlace
// público no tiene sesión, así que el server sube con service_role después
// de confirmar que el ítem es del registro del token.
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  const config = CONFIG_MODULOS_PUBLICOS[enlace.modulo]

  const form = await req.formData()
  const itemIdRaw = form.get('itemId')
  const file = form.get('file')
  if (!itemIdRaw || !(file instanceof File)) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
  const itemId = String(itemIdRaw)

  const sb = getSupabaseAdmin()
  const { data: item } = await sb
    .from(config.tablaItems)
    .select('id')
    .eq('id', itemId)
    .eq(config.fkItems, enlace.registro_id)
    .maybeSingle()
  if (!item) return NextResponse.json({ error: 'Ese ítem no pertenece a este enlace.' }, { status: 404 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${enlace.registro_id}/${itemId}.${ext}`
  const { error: uploadError } = await sb.storage.from(config.bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const patch: Record<string, unknown> = { foto_url: path }
  if (config.camposItemEditables.includes('foto_tomada')) patch.foto_tomada = true
  const { error: patchError } = await sb.from(config.tablaItems).update(patch).eq('id', itemId)
  if (patchError) return NextResponse.json({ error: patchError.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json({ path })
}
