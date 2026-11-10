import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { BUCKET_DATOS, asegurarBucketDatos, obraDesdeCodigo } from '@/lib/terreno/obras'

export const dynamic = 'force-dynamic'

const TIPOS = ['checklist', 'ruta']
const MAX_JSON = 2 * 1024 * 1024
const MAX_RESPALDO = 3 * 1024 * 1024

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
  const autor = String(body.autor ?? '').slice(0, 60)
  const cuerpo = JSON.stringify({ tipo, dispositivo, autor, ts, datos: body.datos })
  if (cuerpo.length > MAX_JSON) return NextResponse.json({ error: 'Estado demasiado grande.' }, { status: 413 })
  // Respaldo completo (todo lo anotado + registro de fotos). Va aparte del estado liviano que lee el
  // equipo, y además queda una copia por hora en historial/ para poder volver atrás.
  let respaldo: string | null = null
  if (typeof body.respaldo === 'object' && body.respaldo !== null) {
    respaldo = JSON.stringify({ tipo, dispositivo, autor, ts, respaldo: body.respaldo })
    if (respaldo.length > MAX_RESPALDO) return NextResponse.json({ error: 'Respaldo demasiado grande.' }, { status: 413 })
  }

  try {
    const sb = getSupabaseAdmin()
    await asegurarBucketDatos(sb)
    const { error } = await sb.storage.from(BUCKET_DATOS).upload(
      `obras/${slug}/estado/${tipo}-${dispositivo}.json`,
      new Blob([cuerpo], { type: 'application/json' }),
      { upsert: true, contentType: 'application/json', cacheControl: '0' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (respaldo) {
      const hora = new Date(ts).toISOString().slice(0, 13).replace(/[-T:]/g, '')   // AAAAMMDDHH (UTC)
      const opciones = { upsert: true, contentType: 'application/json', cacheControl: '0' }
      for (const ruta of [`obras/${slug}/respaldo/${tipo}-${dispositivo}.json`, `obras/${slug}/respaldo/historial/${tipo}-${dispositivo}-${hora}.json`]) {
        const r = await sb.storage.from(BUCKET_DATOS).upload(ruta, new Blob([respaldo], { type: 'application/json' }), opciones)
        if (r.error) return NextResponse.json({ error: 'respaldo: ' + r.error.message }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true, ts, respaldo: !!respaldo })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
