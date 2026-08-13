import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

const CAMPOS = ['ver', 'crear', 'modificar'] as const

// Upsert de una sola celda de la matriz — el resto de columnas del row
// (si ya existe) no se tocan; PostgREST solo actualiza las columnas
// presentes en el payload ante conflicto.
export async function PATCH(req: NextRequest) {
  const denegado = await requireAdmin()
  if (denegado) return denegado

  const body = await req.json()
  const { departamento, puesto, modulo, campo, valor } = body

  if (!departamento || !puesto || !modulo || !CAMPOS.includes(campo) || typeof valor !== 'boolean') {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('permisos_puesto')
    .upsert({ departamento, puesto, modulo, [campo]: valor }, { onConflict: 'departamento,puesto,modulo' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
