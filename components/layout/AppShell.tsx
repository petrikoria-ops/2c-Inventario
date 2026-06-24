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
      <main className="flex-1 md:ml-56 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
