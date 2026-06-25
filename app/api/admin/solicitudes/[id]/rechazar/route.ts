import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    return NextResponse.json({ error: 'No tienes permiso para rechazar solicitudes.' }, { status: 403 })
  }

  const sb = getSupabaseServer()
  const { error } = await sb.from('solicitudes_enrolamiento')
    .update({ estado: 'rechazada', resuelto_en: new Date().toISOString(), resuelto_por: perfil.id })
    .eq('id', params.id)
    .eq('estado', 'pendiente')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
