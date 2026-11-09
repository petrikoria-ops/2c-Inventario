import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { OBRAS_TERRENO, asegurarBucket, listarFotos, obraDesdeCodigo } from '@/lib/terreno/obras'

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
    const fotos = await listarFotos(sb, slug)
    return NextResponse.json({ obra: OBRAS_TERRENO[slug].nombre, fotos })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
