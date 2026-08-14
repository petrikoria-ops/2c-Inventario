import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeAsignarTareas } from '@/lib/auth/permisos.server'
import { NOMBRE_MODULO, type Modulo } from '@/lib/auth/permisos'
import { sendMail } from '@/lib/email/sendMail'

export const dynamic = 'force-dynamic'

const MODULOS_TAREA = ['pruebas_alimentadores', 'verificacion_ric', 'prevencion_riesgos', 'avance_obra']

// POST /api/tareas — asigna una tarea/inspección a otra persona. Exige
// puedeAsignarTareas(perfil) (Gerencia/Admin de software, tier
// administrador, o permiso puntual) — el candado real es la política RLS
// de INSERT en `tareas_asignadas` (mi_puede_asignar_tareas()), esto es
// para devolver un error entendible en vez de una violación de RLS cruda.
export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  if (!puedeAsignarTareas(perfil)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para asignar tareas.' }, { status: 403 })
  }

  const body = await req.json()
  const asignado_a = body.asignado_a as string | undefined
  const titulo = String(body.titulo ?? '').trim()
  if (!asignado_a || !titulo) {
    return NextResponse.json({ error: 'Falta destinatario o título.' }, { status: 400 })
  }
  const modulo = MODULOS_TAREA.includes(body.modulo) ? (body.modulo as Modulo) : null

  const sb = getSupabaseServer()

  // Mismo motivo que en POST /api/mensajes: la RLS de `perfiles` no deja
  // ver la fila de otra persona salvo que seas admin — se usa el
  // directorio (SECURITY DEFINER) para confirmar que el destinatario
  // existe y está activo (el email se resuelve aparte, ver más abajo).
  const { data: directorio, error: dirErr } = await sb.rpc('perfiles_directorio')
  if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 })
  const destinatario = directorio?.find((p: { id: string }) => p.id === asignado_a)
  if (!destinatario) {
    return NextResponse.json({ error: 'El destinatario no existe o no está activo.' }, { status: 400 })
  }

  let proyecto_nombre: string | null = null
  if (body.proyecto_id) {
    const { data: proyecto } = await sb.from('proyectos').select('nombre').eq('id', body.proyecto_id).maybeSingle()
    proyecto_nombre = proyecto?.nombre ?? null
  }

  const { data, error } = await sb
    .from('tareas_asignadas')
    .insert({
      asignado_por: perfil.id,
      asignado_a,
      titulo,
      descripcion: body.descripcion || null,
      proyecto_id: body.proyecto_id || null,
      proyecto_nombre,
      modulo,
      fecha_limite: body.fecha_limite || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // El correo es un plus — si SMTP no está configurado o no se pudo
  // resolver el email, no rompe el flujo (ver lib/email/sendMail.ts), la
  // tarea ya quedó creada. perfiles_directorio() no trae email a propósito
  // (privacidad, ver migration_mensajeria.sql) — perfil_email() es la
  // función aparte, acotada a quien puede asignar, para este uso puntual.
  const { data: emailDestinatario } = await sb.rpc('perfil_email', { target_id: asignado_a })
  if (emailDestinatario) {
    await sendMail({
      to: emailDestinatario,
      subject: `Nueva tarea asignada: ${titulo}`,
      html: `
        <p>${perfil.nombre_completo} te asignó una tarea en 2C Inventario:</p>
        <p><b>${titulo}</b></p>
        ${data.descripcion ? `<p>${data.descripcion}</p>` : ''}
        ${proyecto_nombre ? `<p><b>Obra:</b> ${proyecto_nombre}</p>` : ''}
        ${modulo ? `<p><b>Tipo:</b> ${NOMBRE_MODULO[modulo]}</p>` : ''}
        ${data.fecha_limite ? `<p><b>Fecha límite:</b> ${data.fecha_limite}</p>` : ''}
        <p>Entra a <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/itinerario">tu itinerario</a> para aceptarla o rechazarla.</p>
      `,
    }).catch(() => {})
  }

  return NextResponse.json(data, { status: 201 })
}
