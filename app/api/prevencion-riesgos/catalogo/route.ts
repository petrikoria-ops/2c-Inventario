import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Búsqueda simple sobre el catálogo de hallazgos estándar — reemplaza el
// scoring manual de palabras de generador/catalogo.js de la skill por
// una query ILIKE. Sin IA: el prevencionista elige de la lista.
export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const checklistN = searchParams.get('checklist_n')

  let query = sb.from('catalogo_hallazgos').select('*').order('id').limit(8)

  if (checklistN) {
    query = query.eq('checklist_n', checklistN)
  } else if (q) {
    query = query.or(`diagnostico.ilike.%${q}%,categoria.ilike.%${q}%`)
  } else {
    return NextResponse.json([])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
