import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { sendMail } from '@/lib/email/sendMail'

export const dynamic = 'force-dynamic'

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre_completo, email, departamento_solicitado, puesto_solicitado } = body

  if (!nombre_completo?.trim() || !email?.trim() || !departamento_solicitado || !puesto_solicitado) {
    return NextResponse.json({ error: 'Faltan datos del formulario.' }, { status: 400 })
  }

  const codigo = generarCodigo()
  const sb = getSupabaseServer()

  const { data, error } = await sb
    .from('solicitudes_enrolamiento')
    .insert({
      nombre_completo: nombre_completo.trim(),
      email: email.trim().toLowerCase(),
      departamento_solicitado,
      puesto_solicitado,
      codigo_verificacion: codigo,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const adminEmail = process.env.ADMIN_SOFTWARE_EMAIL
  if (adminEmail) {
    await sendMail({
      to: adminEmail,
      subject: `Nueva solicitud de acceso — ${nombre_completo}`,
      html: `
        <p>Hay una nueva solicitud de acceso a 2C Inventario:</p>
        <ul>
          <li><b>Nombre:</b> ${nombre_completo}</li>
          <li><b>Email:</b> ${email}</li>
          <li><b>Departamento solicitado:</b> ${departamento_solicitado}</li>
          <li><b>Puesto solicitado:</b> ${puesto_solicitado}</li>
        </ul>
        <p><b>Código de verificación: ${codigo}</b></p>
        <p>Entra a <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/solicitudes">/admin/solicitudes</a> (con tu sesión de Administrador de software) e ingresa este código para aprobarla.</p>
      `,
    })
  }

  return NextResponse.json({ ok: true, id: data.id })
}
