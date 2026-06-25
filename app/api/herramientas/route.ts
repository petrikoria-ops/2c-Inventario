import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { escapeOrFilterValue } from '@/lib/utils'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const q      = p.get('q') ?? ''
  const estado = p.get('estado') ?? ''
  let query = sb.from('herramientas').select('*').eq('activo', true)
  if (q) {
    const safeQ = escapeOrFilterValue(q)
    query = query.or(`codigo.ilike."%${safeQ}%",descripcion.ilike."%${safeQ}%"`)
  }
  if (estado) query = query.eq('estado', estado)
  const { data, error } = await query.order('codigo')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const denegado = await requireEditable('herramientas')
  if (denegado) return denegado
  const sb = getSupabaseServer()
  const body = await req.json()

  // El código tiene UNIQUE en la base sin importar "activo": si el código
  // ya lo usó una herramienta eliminada, el insert falla con un error crudo
  // de Postgres. Lo detectamos antes para devolver un mensaje claro.
  if (body.codigo) {
    const { data: existente } = await sb
      .from('herramientas')
      .select('id,activo')
      .eq('codigo', body.codigo)
      .maybeSingle()
    if (existente) {
      const msg = existente.activo
        ? `Ya existe una herramienta activa con el código "${body.codigo}".`
        : `El código "${body.codigo}" ya lo usó una herramienta eliminada anteriormente. Usa otro código, o pide que reactiven esa herramienta en vez de crear una nueva.`
      return NextResponse.json({ error: msg }, { status: 409 })
    }
  }

  const { data, error } = await sb.from('herramientas').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
