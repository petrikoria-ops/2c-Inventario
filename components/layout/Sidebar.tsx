'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Home, LayoutDashboard,
  Package, Wrench, ArrowUpDown, Upload, PackageOpen, Handshake, HardHat, Users, Bot,
  ClipboardList, Building2, ShoppingCart,
  Calculator, CheckSquare, Tag, Menu, X, LogOut,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { LucideIcon } from 'lucide-react'

interface NavLink  { href: string; Icon: LucideIcon; label: string }
interface NavGroup { section: string; links: NavLink[] }

const NAV: NavGroup[] = [
  {
    section: 'Principal',
    links: [
      { href: '/',          Icon: Home,             label: 'Inicio' },
      { href: '/dashboard', Icon: LayoutDashboard,  label: 'Métricas' },
    ],
  },
  {
    section: 'Inventario',
    links: [
      { href: '/materiales',   Icon: Package,     label: 'Materiales' },
      { href: '/herramientas',          Icon: Wrench,    label: 'Herramientas'           },
      { href: '/herramientas/entregar', Icon: HardHat,  label: 'Entregar herramientas'  },
      { href: '/trabajadores',          Icon: Users,    label: 'Trabajadores'           },
      { href: '/movimientos',  Icon: ArrowUpDown,  label: 'Movimientos' },
      { href: '/importar',     Icon: Upload,       label: 'Importar' },
      { href: '/salidas',         Icon: PackageOpen, label: 'Salidas'            },
      { href: '/entregas/nueva', Icon: Handshake,   label: 'Entrega por mano'  },
    ],
  },
  {
    section: 'Gestión',
    links: [
      { href: '/proyectos',   Icon: ClipboardList, label: 'Obras activas — Tableros' },
      { href: '/proveedores', Icon: Building2,     label: 'Proveedores' },
      { href: '/solicitudes', Icon: ShoppingCart,  label: 'Compras' },
    ],
  },
  {
    section: 'Recursos',
    links: [
      { href: '/recursos',   Icon: Calculator,   label: 'Recursos Técnicos' },
      { href: '/checklist',  Icon: CheckSquare,  label: 'Checklist tablero' },
      { href: '/etiquetas',  Icon: Tag,          label: 'Etiquetas de obra'  },
      { href: '/agente',     Icon: Bot,          label: 'Agente IA'          },
    ],
  },
]

export function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  const router    = useRouter()

  const cerrarSesion = async () => {
    await getSupabaseBrowser().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {/* Marca */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: '#3A3F47' }}>
        <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
          <Image
            src="/logo-2c.png"
            alt="2C Montajes"
            width={36}
            height={36}
            style={{ width: 36, height: 36, objectFit: 'contain' }}
            priority
          />
        </div>
        <div className="min-w-0">
          <div className="text-white font-bold text-[13px] leading-tight truncate">2C Montajes</div>
          <div className="text-[11px] leading-tight" style={{ color: '#6B7480' }}>Inventario General</div>
        </div>
      </div>

      {/* Nav — con degradado inferior que insinúa que hay más opciones al desplazar */}
      <div className="relative flex-1 min-h-0">
        <nav className="h-full overflow-y-auto py-3">
          {NAV.map(group => (
            <div key={group.section} className="mb-1">
              <div className="text-[10px] uppercase tracking-widest font-semibold px-4 pt-3 pb-1"
                style={{ color: '#4A5260' }}>
                {group.section}
              </div>
              {group.links.map(({ href, Icon, label }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} onClick={onNav}
                    className={`nav-link ${active ? 'active' : ''}`}>
                    <Icon size={15} strokeWidth={2} className="flex-shrink-0" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6"
          style={{ background: 'linear-gradient(to bottom, transparent, #2E333A)' }} />
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={cerrarSesion}
        className="flex items-center gap-2 px-4 py-2.5 mx-2 mb-1 rounded-md text-xs transition-colors hover:bg-[#3D4450]"
        style={{ color: '#9AA3AE' }}
      >
        <LogOut size={14} /> Cerrar sesión
      </button>

      {/* Footer empresa */}
      <div className="px-4 py-3 border-t text-[10px] leading-snug" style={{ borderColor: '#3A3F47', color: '#4A5260' }}>
        2C Montajes y Proyectos Eléctricos
      </div>
    </>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Barra superior móvil — reemplaza el botón flotante que tapaba el
          título de cada página; reserva su propio espacio (ver AppShell). */}
      <header
        className="mobile-topbar md:hidden fixed top-0 left-0 right-0 h-14 z-[300] flex items-center gap-3 px-3 shadow-md"
        style={{ backgroundColor: '#2E333A' }}
      >
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-white transition-colors hover:bg-white/10 flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/logo-2c.png" alt="2C Montajes" width={24} height={24}
            style={{ width: 24, height: 24, objectFit: 'contain' }} priority />
          <span className="text-white font-bold text-[13px] truncate">2C Inventario</span>
        </div>
      </header>

      {/* Overlay móvil */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[250] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar escritorio */}
      <aside className="hidden md:flex flex-col w-56 fixed top-0 left-0 h-screen z-[200]"
        style={{ backgroundColor: '#2E333A' }}>
        <SidebarContent />
      </aside>

      {/* Sidebar móvil (drawer) */}
      <aside
        className={`md:hidden flex flex-col w-64 fixed top-0 left-0 h-screen z-[300] rounded-r-2xl overflow-hidden
                    shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#2E333A' }}
      >
        <div className="flex justify-end p-3">
          <button onClick={() => setOpen(false)} style={{ color: '#6B7480' }}
            className="p-1.5 rounded hover:bg-[#3D4450] transition-colors" aria-label="Cerrar menú">
            <X size={16} />
          </button>
        </div>
        <SidebarContent onNav={() => setOpen(false)} />
      </aside>
    </>
  )
}
