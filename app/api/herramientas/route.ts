import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q      = p.get('q') ?? ''
  const estado = p.get('estado') ?? ''
  let query = sb.from('herramientas').select('*').eq('activo', true)
  if (q)      query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`)
  if (estado) query = query.eq('estado', estado)
  const { data, error } = await query.order('codigo')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const body = await req.json()
  const { data, error } = await sb.from('herramientas').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
