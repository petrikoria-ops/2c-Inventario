import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denegado = await requireEditable('trabajadores')
  if (denegado) return denegado

  const sb   = getSupabaseServer()
  const body = await req.json()
  const { error } = await sb.from('trabajadores').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denegado = await requireEditable('trabajadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const { error } = await sb.from('trabajadores').update({ activo: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
