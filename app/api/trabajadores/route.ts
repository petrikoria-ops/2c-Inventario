import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const soloActivos = searchParams.get('activos') !== 'false'

  let query = sb.from('trabajadores').select('*').order('nombre')
  if (soloActivos) query = query.eq('activo', true)
  if (q) query = query.or(`nombre.ilike.%${q}%,rut.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const body = await req.json()
  if (!body.nombre?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const { data, error } = await sb
    .from('trabajadores')
    .insert({ ...body, activo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
