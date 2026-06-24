import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { escapeOrFilterValue } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q      = p.get('q') ?? ''
  const estado = p.get('estado') ?? ''
  let query = sb.from('proyectos').select(`
    *,
    costo_total:movimientos(tipo, cantidad, precio_unit)
  `)
  if (q) {
    const safeQ = escapeOrFilterValue(q)
    query = query.or(`ot.ilike."%${safeQ}%",nombre.ilike."%${safeQ}%",cliente.ilike."%${safeQ}%"`)
  }
  if (estado) query = query.eq('estado', estado)
  const { data, error } = await query.order('creado_en', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('proyectos').insert(await req.json()).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
