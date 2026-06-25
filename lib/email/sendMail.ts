import nodemailer from 'nodemailer'

// Envía correo por el SMTP de la empresa (Gmail/Workspace u otro).
// Sin las variables de entorno configuradas, no rompe el flujo que lo
// llama — solo registra en consola que el correo no se pudo enviar,
// para que /solicitar-acceso siga funcionando (crea la solicitud en la
// base) mientras se terminan de configurar las credenciales SMTP.
export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[sendMail] SMTP no configurado — no se envió el correo a', opts.to)
    return false
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  try {
    await transporter.sendMail({
      from: `"2C Inventario" <${SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return true
  } catch (err) {
    console.error('[sendMail] Error enviando correo:', err)
    return false
  }
}
