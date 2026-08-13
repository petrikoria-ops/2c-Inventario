import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { escapeOrFilterValue } from '@/lib/utils'
import { getPerfil, puedeVer, requireCrear } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

// GET queda abierto a cualquier autenticado porque Entrega de herramientas
// y Trabajadores de obra necesitan buscar trabajadores por nombre desde
// departamentos sin acceso al módulo Trabajadores (bodega/taller/oficina
// técnica). El RUT sí es exclusivo de RRHH/directiva/admin — se omite del
// resto de las respuestas (ver AUD-010).
export async function GET(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const soloActivos = searchParams.get('activos') !== 'false'

  let query = sb.from('trabajadores').select('*').order('nombre')
  if (soloActivos) query = query.eq('activo', true)
  if (q) {
    const safeQ = escapeOrFilterValue(q)
    query = query.or(`nombre.ilike."%${safeQ}%",rut.ilike."%${safeQ}%"`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const verCompleto = puedeVer(perfil, 'trabajadores')
  const salida = verCompleto ? (data ?? []) : (data ?? []).map(({ rut, ...resto }) => resto)
  return NextResponse.json({ data: salida })
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('trabajadores')
  if (denegado) return denegado

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
