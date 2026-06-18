import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { aiMatchUnmatched, candidatosPorSolapamiento } from '@/lib/solicitudes/aiMatch'

export const dynamic = 'force-dynamic'

const AI_ENABLED = process.env.AI_CLASSIFY_ENABLED === 'true'

const PAGE_SIZE = 1000

const normCodigo = (v: unknown) => String(v ?? '').trim().toUpperCase()
const normDesc = (v: unknown) =>
  String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

interface InputItem {
  codigo:      string
  descripcion: string
  unidad:      string
  cantidad:    number
}

type MatchTipo = 'codigo' | 'descripcion' | 'ia' | 'sin_match'

interface MatchedItem {
  codigo:             string
  descripcion:        string
  unidad:             string
  cantidad_pedida:    number
  material_id:        number | null
  stock_actual:       number | null
  precio_unitario:    number | null
  proveedor_sugerido: string | null
  match:              MatchTipo
}

// Trae todos los materiales activos paginando con .range() — sin esto, un
// inventario grande quedaría truncado en silencio por el tope implícito de
// PostgREST (mismo bug que se arregló en /materiales).
async function fetchAllMateriales(sb: ReturnType<typeof getSupabaseServer>) {
  const rows: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('materiales')
      .select('id,codigo,descripcion,unidad,stock_actual,precio_unitario,proveedores(nombre)')
      .eq('activo', true)
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, error: null as null | { message: string } }
}

export async function POST(req: NextRequest) {
  const { items }: { items: InputItem[] } = await req.json()
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Se requieren ítems' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { rows: materiales, error } = await fetchAllMateriales(sb)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const porCodigo = new Map<string, any>()
  const porDescripcion = new Map<string, any>()
  for (const m of materiales!) {
    if (m.codigo) porCodigo.set(normCodigo(m.codigo), m)
    porDescripcion.set(normDesc(m.descripcion), m)
  }

  const result: MatchedItem[] = items.map(item => {
    const codigo = String(item.codigo ?? '').trim()
    let match: MatchTipo = 'sin_match'
    let mat: any = null

    if (codigo) mat = porCodigo.get(normCodigo(codigo)) ?? null
    if (mat) match = 'codigo'
    else {
      mat = porDescripcion.get(normDesc(item.descripcion)) ?? null
      if (mat) match = 'descripcion'
    }

    return {
      codigo:             codigo || mat?.codigo || '',
      descripcion:        item.descripcion,
      unidad:             item.unidad || mat?.unidad || '',
      cantidad_pedida:    item.cantidad,
      material_id:        mat?.id ?? null,
      stock_actual:       mat?.stock_actual ?? null,
      precio_unitario:    mat?.precio_unitario ?? null,
      proveedor_sugerido: mat?.proveedores?.nombre ?? null,
      match,
    }
  })

  // ── Paso 2: para lo que no calzó por código/descripción exacta, intentar
  // con IA (Groq) usando como candidatos solo materiales con palabras en
  // común — opcional, nunca bloquea si no hay API key o falla la llamada.
  const apiKey = process.env.GROQ_API_KEY
  if (AI_ENABLED && apiKey) {
    const sinMatchConCandidatos = result
      .map((r, idx) => ({ idx, r }))
      .filter(({ r }) => r.match === 'sin_match')
      .map(({ idx, r }) => ({
        idx,
        descripcion: r.descripcion,
        candidatos: candidatosPorSolapamiento(r.descripcion, materiales!),
      }))

    if (sinMatchConCandidatos.length > 0) {
      const elegidos = await aiMatchUnmatched(sinMatchConCandidatos, apiKey)
      elegidos.forEach((codigoElegido, idx) => {
        if (!codigoElegido) return
        const mat = porCodigo.get(normCodigo(codigoElegido))
        if (!mat) return
        result[idx] = {
          ...result[idx],
          codigo:             mat.codigo,
          unidad:             result[idx].unidad || mat.unidad || '',
          material_id:        mat.id,
          stock_actual:       mat.stock_actual,
          precio_unitario:    mat.precio_unitario,
          proveedor_sugerido: mat.proveedores?.nombre ?? null,
          match:              'ia',
        }
      })
    }
  }

  return NextResponse.json({ items: result, aiEnabled: AI_ENABLED && !!apiKey })
}
