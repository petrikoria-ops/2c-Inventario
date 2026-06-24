'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

// /login no lleva sidebar — se detecta por ruta para no tener que mover
// todas las carpetas de app/ a un route group separado.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
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
