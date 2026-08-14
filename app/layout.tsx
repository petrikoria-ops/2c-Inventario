import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/contexts/ToastContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { getContextoUsuario } from '@/lib/auth/verComo'
import { getSupabaseServer } from '@/lib/supabase/server'
import { puedeVerConectados } from '@/lib/auth/permisos'
import type { PerfilDirectorio } from '@/types'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '2C Montajes · Inventario',
  description: 'Sistema de gestión de inventario — 2C Montajes y Proyectos Eléctricos',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='5' fill='%232E333A'/><text y='23' x='3' font-size='17' font-weight='700' font-family='Inter,system-ui' fill='%23F0C000'>2C</text></svg>",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { real, efectivo, puedeSimular, verComo } = await getContextoUsuario()

  // El conteo de errores pendientes depende del rol REAL (no del simulado).
  let erroresPendientes = 0
  if (puedeSimular) {
    const sb = getSupabaseServer()
    const { count } = await sb.from('error_log').select('*', { count: 'exact', head: true }).eq('resuelto', false)
    erroresPendientes = count ?? 0
  }

  // Presencia/mensajería son de la PERSONA real que inició sesión, nunca del
  // perfil simulado por "Ver como" — un admin viendo "bodega" sigue siendo
  // él mismo en el chat, no se convierte en un bodeguero fantasma.
  let mensajesNoLeidos = 0
  if (real) {
    const sb = getSupabaseServer()
    const { count } = await sb
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', real.id)
      .is('leido_en', null)
    mensajesNoLeidos = count ?? 0
  }

  // Directorio para el desplegable "Conectados" de la barra lateral — solo
  // se pide si el perfil REAL puede verlo (jefatura desde Visitador de obra
  // hacia arriba), para no traer datos que ni se van a mostrar.
  let directorioConectados: PerfilDirectorio[] = []
  if (real && puedeVerConectados(real)) {
    const sb = getSupabaseServer()
    const { data } = await sb.rpc('perfiles_directorio')
    directorioConectados = data ?? []
  }

  // Badge de "Itinerario" — tareas asignadas a mí que sigo sin aceptar/rechazar.
  let tareasPendientes = 0
  if (real) {
    const sb = getSupabaseServer()
    const { count } = await sb
      .from('tareas_asignadas')
      .select('*', { count: 'exact', head: true })
      .eq('asignado_a', real.id)
      .eq('estado', 'pendiente')
    tareasPendientes = count ?? 0
  }

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ToastProvider>
          <PresenceProvider perfil={real} noLeidosInicial={mensajesNoLeidos} tareasPendientesInicial={tareasPendientes}>
            <AppShell
              perfil={efectivo}
              perfilReal={real}
              puedeSimular={puedeSimular}
              verComo={verComo}
              erroresPendientes={erroresPendientes}
              directorioConectados={directorioConectados}
            >{children}</AppShell>
          </PresenceProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
