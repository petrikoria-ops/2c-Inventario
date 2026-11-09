import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  BUCKET_TERRENO, EXT_POR_MIME, MAX_BYTES_FOTO, asegurarBucket, obraDesdeCodigo, rutaFoto,
} from '@/lib/terreno/obras'

export const dynamic = 'force-dynamic'

// Entrega una URL firmada para que el teléfono suba la foto DIRECTO a Supabase
// Storage (sin pasar los bytes por esta función: Vercel limita el body a
// ~4,5 MB y una foto de iPhone puede pesar más). Público, sin sesión: el
// control de acceso es el código de obra (ver lib/terreno/obras.ts).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })
  }

  const slug = obraDesdeCodigo(body.codigo)
  if (!slug) return NextResponse.json({ error: 'Código de obra no válido.' }, { status: 403 })

  const mime = String(body.mime ?? '')
  const ext = EXT_POR_MIME[mime]
  if (!ext) return NextResponse.json({ error: 'Formato de imagen no admitido: ' + mime }, { status: 400 })

  const size = Number(body.size)
  if (!(size > 0 && size <= MAX_BYTES_FOTO)) return NextResponse.json({ error: 'Tamaño de foto no válido.' }, { status: 400 })

  const ts = Number(body.ts)
  const id = String(body.id ?? '')
  if (!Number.isInteger(ts) || ts < 1e12 || ts > 1e13 || !/^[a-z0-9]{4,40}$/i.test(id)) {
    return NextResponse.json({ error: 'Identificador de foto no válido.' }, { status: 400 })
  }

  try {
    const sb = getSupabaseAdmin()
    await asegurarBucket(sb)
    const path = rutaFoto(slug, ts, id, ext, (body.meta ?? {}) as Record<string, string>)
    const { data, error } = await sb.storage.from(BUCKET_TERRENO).createSignedUploadUrl(path)
    if (error) {
      // Ya estaba subida (reintento tras un corte): para el teléfono es éxito.
      if (/exist|duplicate/i.test(error.message)) return NextResponse.json({ ya: true, path })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ url: data.signedUrl, path, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
