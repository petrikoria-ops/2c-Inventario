import { NextResponse } from 'next/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import { sendMail } from '@/lib/email/sendMail'

export const dynamic = 'force-dynamic'

// Endpoint de diagnóstico temporal — solo admin_software/master. Intenta
// enviar un correo de prueba a ADMIN_SOFTWARE_EMAIL y devuelve el error
// real de SMTP si falla, para no tener que ir a buscar logs de Vercel.
export async function POST() {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const to = process.env.ADMIN_SOFTWARE_EMAIL
  if (!to) return NextResponse.json({ ok: false, error: 'Falta ADMIN_SOFTWARE_EMAIL en el entorno.' })

  const envCheck = {
    SMTP_HOST: process.env.SMTP_HOST ?? null,
    SMTP_PORT: process.env.SMTP_PORT ?? null,
    SMTP_USER: process.env.SMTP_USER ?? null,
    SMTP_PASS_set: Boolean(process.env.SMTP_PASS),
    SMTP_PASS_length: process.env.SMTP_PASS?.length ?? 0,
    ADMIN_SOFTWARE_EMAIL: to,
  }

  const result = await sendMail({
    to,
    subject: 'Prueba SMTP — 2C Inventario',
    html: '<p>Si recibiste esto, el envío de correo está funcionando correctamente.</p>',
  })

  return NextResponse.json({ ...result, envCheck })
}
