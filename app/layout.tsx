import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/contexts/ToastContext'
import { getPerfil } from '@/lib/auth/permisos.server'
import { getSupabaseServer } from '@/lib/supabase/server'

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
  const perfil = await getPerfil()

  let erroresPendientes = 0
  if (perfil && (perfil.nivel_acceso === 'admin_software' || perfil.nivel_acceso === 'master')) {
    const sb = getSupabaseServer()
    const { count } = await sb.from('error_log').select('*', { count: 'exact', head: true }).eq('resuelto', false)
    erroresPendientes = count ?? 0
  }

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ToastProvider>
          <AppShell perfil={perfil} erroresPendientes={erroresPendientes}>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
