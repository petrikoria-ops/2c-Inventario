'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import type { Perfil } from '@/lib/auth/permisos'

// Páginas sin sidebar — se detecta por ruta para no tener que mover
// todas las carpetas de app/ a un route group separado.
const SIN_SIDEBAR = ['/login', '/solicitar-acceso', '/pendiente-aprobacion']

export default function AppShell({ children, perfil, erroresPendientes = 0 }: { children: React.ReactNode; perfil: Perfil | null; erroresPendientes?: number }) {
  const pathname = usePathname()

  if (SIN_SIDEBAR.includes(pathname)) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} erroresPendientes={erroresPendientes} />
      {/* pt-14 reserva el alto de la barra superior móvil (fixed) para que
          el título de cada página nunca quede tapado por ella. */}
      <main className="flex-1 md:ml-56 min-h-screen flex flex-col pt-14 md:pt-0">
        <div className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
