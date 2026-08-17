'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import PanelChatDeslizante from '@/components/mensajeria/PanelChatDeslizante'
import type { Perfil, Departamento } from '@/lib/auth/permisos'
import type { PerfilDirectorio } from '@/types'

// Páginas sin sidebar — se detecta por ruta para no tener que mover
// todas las carpetas de app/ a un route group separado.
const SIN_SIDEBAR = ['/login', '/solicitar-acceso', '/pendiente-aprobacion']

export default function AppShell({
  children,
  perfil,
  perfilReal = null,
  puedeSimular = false,
  verComo = null,
  verComoPuesto = null,
  erroresPendientes = 0,
  directorioConectados = [],
}: {
  children: React.ReactNode
  perfil: Perfil | null
  perfilReal?: Perfil | null
  puedeSimular?: boolean
  verComo?: Departamento | null
  verComoPuesto?: string | null
  erroresPendientes?: number
  directorioConectados?: PerfilDirectorio[]
}) {
  const pathname = usePathname()

  // /completar/[token] es dinámica (token en la URL) — no calza con el
  // .includes() de rutas fijas de arriba, por eso el prefijo aparte.
  if (SIN_SIDEBAR.includes(pathname) || pathname.startsWith('/completar/')) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar
        perfil={perfil}
        puedeSimular={puedeSimular}
        verComo={verComo}
        verComoPuesto={verComoPuesto}
        erroresPendientes={erroresPendientes}
        directorioConectados={directorioConectados}
      />
      {/* pt-14 reserva el alto de la barra superior móvil (fixed) para que
          el título de cada página nunca quede tapado por ella.
          min-w-0: sin esto, un elemento flex no se achica más allá del
          ancho mínimo de su contenido — una tabla ancha (ej. Materiales)
          empuja todo el layout y aparece scroll horizontal de la página
          entera en vez de quedar contenido en el overflow-x-auto de la
          tabla. Con min-w-0 el que scrollea es solo el contenedor de la
          tabla, como corresponde. */}
      <main className="flex-1 md:ml-56 min-h-screen flex flex-col pt-14 md:pt-0 min-w-0">
        <div className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto min-w-0">
          {children}
        </div>
      </main>
      <PanelChatDeslizante miId={perfilReal?.id ?? null} />
    </div>
  )
}
