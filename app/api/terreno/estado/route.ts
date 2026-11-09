import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { BUCKET_DATOS, asegurarBucketDatos, obraDesdeCodigo } from '@/lib/terreno/obras'

export const dynamic = 'force-dynamic'

const TIPOS = ['checklist', 'ruta']
const MAX_JSON = 2 * 1024 * 1024

// Cada teléfono sube aquí su estado (checklist: ítems, N/A, notas; ruta:
// circuitos marcados y notas) para que el informe en vivo lo muestre. Un
// archivo por teléfono y tipo; se sobrescribe en cada cambio.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })
  }
  const slug = obraDesdeCodigo(body.codigo)
  if (!slug) return NextResponse.json({ error: 'Código de obra no válido.' }, { status: 403 })

  const tipo = String(body.tipo ?? '')
  const dispositivo = String(body.dispositivo ?? '')
  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: 'Tipo no válido.' }, { status: 400 })
  if (!/^[a-z0-9]{4,24}$/i.test(dispositivo)) return NextResponse.json({ error: 'Dispositivo no válido.' }, { status: 400 })
  if (typeof body.datos !== 'object' || body.datos === null) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })

  const ts = Date.now()
  const cuerpo = JSON.stringify({ tipo, dispositivo, autor: String(body.autor ?? '').slice(0, 60), ts, datos: body.datos })
  if (cuerpo.length > MAX_JSON) return NextResponse.json({ error: 'Estado demasiado grande.' }, { status: 413 })

  try {
    const sb = getSupabaseAdmin()
    await asegurarBucketDatos(sb)
    const { error } = await sb.storage.from(BUCKET_DATOS).upload(
      `obras/${slug}/estado/${tipo}-${dispositivo}.json`,
      new Blob([cuerpo], { type: 'application/json' }),
      { upsert: true, contentType: 'application/json', cacheControl: '0' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, ts })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
