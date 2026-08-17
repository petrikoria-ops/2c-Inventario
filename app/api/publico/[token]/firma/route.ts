import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'
import { CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

// Sube la firma dibujada (PNG del canvas) y la deja guardada en la cabecera.
// `campo` es el nombre exacto de la columna *_imagen_url (ej.
// 'firma_imagen_url', 'firma_prevencionista_imagen_url') — se valida contra
// la whitelist del módulo para no poder escribir cualquier columna.
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  const config = CONFIG_MODULOS_PUBLICOS[enlace.modulo]

  const form = await req.formData()
  const campo = form.get('campo')
  const file = form.get('file')
  if (typeof campo !== 'string' || !campo.endsWith('_imagen_url') || !config.camposCabeceraEditables.includes(campo)) {
    return NextResponse.json({ error: 'Campo de firma no válido.' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta la imagen de la firma.' }, { status: 400 })

  const nombreArchivo = campo.replace(/_imagen_url$/, '').replace(/_/g, '-')
  const path = `${enlace.registro_id}/${nombreArchivo}.png`

  const sb = getSupabaseAdmin()
  const { error: uploadError } = await sb.storage.from(config.bucket).upload(path, file, {
    upsert: true,
    contentType: 'image/png',
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: patchError } = await sb.from(config.tabla).update({ [campo]: path }).eq('id', enlace.registro_id)
  if (patchError) return NextResponse.json({ error: patchError.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json({ path })
}
