import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const q = new URL(req.url).searchParams.get('q') ?? ''
  let query = sb.from('proveedores').select('*').eq('activo', true)
  if (q) query = query.or(`nombre.ilike.%${q}%,rut.ilike.%${q}%,contacto.ilike.%${q}%`)
  const { data, error } = await query.order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('proveedores').insert(await req.json()).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
