import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { escapeOrFilterValue } from '@/lib/utils'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const q = new URL(req.url).searchParams.get('q') ?? ''
  let query = sb.from('proveedores').select('*').eq('activo', true)
  if (q) {
    const safeQ = escapeOrFilterValue(q)
    query = query.or(`nombre.ilike."%${safeQ}%",rut.ilike."%${safeQ}%",contacto.ilike."%${safeQ}%"`)
  }
  const { data, error } = await query.order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const denegado = await requireEditable('proveedores')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('proveedores').insert(await req.json()).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
