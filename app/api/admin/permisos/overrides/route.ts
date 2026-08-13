import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireAdmin, getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const denegado = await requireAdmin()
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('permisos_usuario_overrides')
    .select('*,perfiles(nombre_completo,email)')
    .order('creado_en', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// Upsert por (usuario_id, modulo) — agregar una excepción para la misma
// persona+módulo dos veces actualiza la existente en vez de duplicarla.
export async function POST(req: NextRequest) {
  const denegado = await requireAdmin()
  if (denegado) return denegado

  const perfil = await getPerfil()
  const body = await req.json()
  const { usuario_id, modulo, ver, crear, modificar, notas } = body

  if (!usuario_id || !modulo) {
    return NextResponse.json({ error: 'Persona y módulo son obligatorios' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('permisos_usuario_overrides')
    .upsert(
      {
        usuario_id, modulo,
        ver: ver ?? null, crear: crear ?? null, modificar: modificar ?? null,
        notas: notas ?? null, creado_por: perfil?.id ?? null,
      },
      { onConflict: 'usuario_id,modulo' },
    )
    .select('*,perfiles(nombre_completo,email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
