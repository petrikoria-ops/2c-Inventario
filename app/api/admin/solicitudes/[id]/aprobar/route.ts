import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getPerfil } from '@/lib/auth/permisos.server'
import { logError } from '@/lib/errors/logError'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Ctx) {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    return NextResponse.json({ error: 'No tienes permiso para aprobar solicitudes.' }, { status: 403 })
  }

  const { codigo, nivel_acceso } = await req.json()
  if (!codigo || !nivel_acceso) {
    return NextResponse.json({ error: 'Falta el código o el nivel de acceso a asignar.' }, { status: 400 })
  }

  const sb = getSupabaseServer()
  const { data: solicitud, error: errSol } = await sb
    .from('solicitudes_enrolamiento')
    .select('*')
    .eq('id', params.id)
    .single()
  if (errSol || !solicitud) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
  if (solicitud.estado !== 'pendiente') return NextResponse.json({ error: 'Esta solicitud ya fue resuelta.' }, { status: 409 })
  if (solicitud.codigo_verificacion !== String(codigo).trim()) {
    return NextResponse.json({ error: 'El código de verificación no coincide.' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Invita al nuevo usuario — Supabase le manda un correo con un link
  // para que defina su contraseña y quede con sesión iniciada.
  const { data: invite, error: errInvite } = await admin.auth.admin.inviteUserByEmail(solicitud.email)
  if (errInvite || !invite.user) {
    await logError({
      mensaje: `Fallo al invitar usuario para solicitud #${params.id}: ${errInvite?.message ?? 'sin user'}`,
      archivo: 'app/api/admin/solicitudes/[id]/aprobar/route.ts',
      usuario: perfil.email,
    })
    return NextResponse.json({ error: errInvite?.message ?? 'No se pudo invitar al usuario.' }, { status: 500 })
  }

  const { error: errPerfil } = await admin.from('perfiles').insert({
    id: invite.user.id,
    nombre_completo: solicitud.nombre_completo,
    email: solicitud.email,
    departamento: solicitud.departamento_solicitado,
    puesto: solicitud.puesto_solicitado,
    nivel_acceso,
  })
  if (errPerfil) {
    await logError({
      mensaje: `Fallo al crear perfil tras invitar a ${solicitud.email}: ${errPerfil.message}`,
      archivo: 'app/api/admin/solicitudes/[id]/aprobar/route.ts',
      usuario: perfil.email,
    })
    return NextResponse.json({ error: errPerfil.message }, { status: 500 })
  }

  await sb.from('solicitudes_enrolamiento')
    .update({ estado: 'aprobada', resuelto_en: new Date().toISOString(), resuelto_por: perfil.id })
    .eq('id', params.id)

  return NextResponse.json({ ok: true })
}
