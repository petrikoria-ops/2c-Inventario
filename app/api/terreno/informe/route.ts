import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  BUCKET_DATOS, OBRAS_TERRENO, asegurarBucket, asegurarBucketDatos, listarFotos, obraDesdeCodigo,
} from '@/lib/terreno/obras'

export const dynamic = 'force-dynamic'

// Informe en vivo: fotos de la nube + estado de cada teléfono (checklist y
// ruta). La página public/terreno/informe.html lo consulta cada ~20 s.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })
  }
  const slug = obraDesdeCodigo(body.codigo)
  if (!slug) return NextResponse.json({ error: 'Código de obra no válido.' }, { status: 403 })

  try {
    const sb = getSupabaseAdmin()
    await asegurarBucket(sb)
    await asegurarBucketDatos(sb)
    const fotos = await listarFotos(sb, slug)

    const prefijo = `obras/${slug}/estado`
    const { data: lista, error } = await sb.storage.from(BUCKET_DATOS).list(prefijo, { limit: 100 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const estados: unknown[] = []
    for (const o of (lista ?? []).filter(x => x.id && x.name.endsWith('.json'))) {
      const { data } = await sb.storage.from(BUCKET_DATOS).download(`${prefijo}/${o.name}`)
      if (!data) continue
      try { estados.push(JSON.parse(await data.text())) } catch { /* archivo dañado: se ignora */ }
    }
    return NextResponse.json({ obra: OBRAS_TERRENO[slug].nombre, ahora: Date.now(), fotos, estados })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
