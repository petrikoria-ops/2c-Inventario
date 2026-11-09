import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { BUCKET_TERRENO, OBRAS_TERRENO, asegurarBucket, leerNombre, obraDesdeCodigo } from '@/lib/terreno/obras'

export const dynamic = 'force-dynamic'

// Lista todas las fotos respaldadas de una obra (las de todos los teléfonos),
// con URLs firmadas de 1 hora para verlas o bajarlas. POST para que el código
// de obra no quede en logs de URL.
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
    const prefijo = `obras/${slug}/f`
    const objetos: { name: string; id: string | null; metadata: Record<string, unknown> | null; created_at: string | null }[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.storage.from(BUCKET_TERRENO).list(prefijo, {
        limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      objetos.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }

    const archivos = objetos.filter(o => o.id)
    const urls: (string | null)[] = []
    for (let i = 0; i < archivos.length; i += 100) {
      const lote = archivos.slice(i, i + 100).map(o => `${prefijo}/${o.name}`)
      const { data, error } = await sb.storage.from(BUCKET_TERRENO).createSignedUrls(lote, 3600)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      lote.forEach((_, k) => urls.push(data?.[k]?.signedUrl ?? null))
    }

    const fotos = archivos.map((o, k) => {
      const n = leerNombre(o.name)
      return {
        nombre: o.name,
        url: urls[k],
        size: Number(o.metadata?.size ?? 0),
        mime: String(o.metadata?.mimetype ?? ''),
        subida: o.created_at,
        ts: n?.ts ?? 0,
        id: n?.id ?? '',
        ext: n?.ext ?? 'jpg',
        seccion: n?.meta.s ?? '',
        item: n?.meta.i ?? '',
        itemId: n?.meta.id ?? '',
        slot: n?.meta.sl ?? '',
        autor: n?.meta.a ?? '',
      }
    })
    return NextResponse.json({ obra: OBRAS_TERRENO[slug].nombre, fotos })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
