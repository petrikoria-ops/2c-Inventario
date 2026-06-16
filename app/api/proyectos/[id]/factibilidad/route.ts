import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

type EstadoItem = 'ok' | 'parcial' | 'sin_stock' | 'no_registrado'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()

  // Obtener BOM del proyecto
  const { data: bom, error: bomErr } = await sb
    .from('proyectos_materiales')
    .select('*')
    .eq('proyecto_id', params.id)
    .order('id')

  if (bomErr) return NextResponse.json({ error: bomErr.message }, { status: 500 })
  if (!bom?.length) return NextResponse.json({ items: [], status: 'sin_bom' })

  // Recopilar codigos e ids de materiales del BOM
  const codigos = bom.map(r => r.codigo).filter((v, i, a) => a.indexOf(v) === i)
  const matIds  = bom.map(r => r.material_id).filter((v): v is number => v != null)

  // Consultar stock actual (por id o por código)
  const [byId, byCod] = await Promise.all([
    matIds.length
      ? sb.from('materiales').select('id,codigo,stock_actual').in('id', matIds).eq('activo', true)
      : { data: [] as any[], error: null },
    codigos.length
      ? sb.from('materiales').select('id,codigo,stock_actual').in('codigo', codigos).eq('activo', true)
      : { data: [] as any[], error: null },
  ])

  // Construir mapa codigo → stock (prioriza búsqueda por id)
  const stockMap: Record<string, number> = {}
  const idMap: Record<string, number> = {}
  for (const m of [...(byId.data ?? []), ...(byCod.data ?? [])]) {
    stockMap[m.codigo] = m.stock_actual
    idMap[m.codigo]    = m.id
  }

  // Evaluar cada ítem
  let faltanCount = 0
  const items = bom.map(r => {
    const disponible = stockMap[r.codigo] ?? null
    const esRegistrado = disponible !== null

    let estado: EstadoItem
    let faltante: number

    if (!esRegistrado) {
      estado   = 'no_registrado'
      faltante = r.cantidad_requerida
    } else if (disponible >= r.cantidad_requerida) {
      estado   = 'ok'
      faltante = 0
    } else if (disponible > 0) {
      estado   = 'parcial'
      faltante = r.cantidad_requerida - disponible
    } else {
      estado   = 'sin_stock'
      faltante = r.cantidad_requerida
    }

    if (faltante > 0) faltanCount++

    return {
      ...r,
      material_id:  r.material_id ?? idMap[r.codigo] ?? null,
      stock_actual: disponible ?? 0,
      faltante,
      estado,
    }
  })

  const status = faltanCount === 0 ? 'completo' : 'incompleto'
  return NextResponse.json({ items, status, faltanCount, totalItems: bom.length })
}
