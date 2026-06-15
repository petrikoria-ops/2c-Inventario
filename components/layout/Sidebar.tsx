'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  {
    section: 'Principal',
    links: [
      { href: '/',            icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    section: 'Inventario',
    links: [
      { href: '/materiales',   icon: '🔌', label: 'Materiales' },
      { href: '/herramientas', icon: '🔧', label: 'Herramientas' },
      { href: '/movimientos',  icon: '↕️', label: 'Movimientos' },
      { href: '/importar',     icon: '📥', label: 'Importar' },
    ],
  },
  {
    section: 'Gestión',
    links: [
      { href: '/proyectos',   icon: '📋', label: 'Proyectos / OT' },
      { href: '/proveedores', icon: '🏭', label: 'Proveedores' },
    ],
  },
  {
    section: 'Recursos',
    links: [
      { href: '/recursos', icon: '📐', label: 'Calculadoras y Normas' },
    ],
  },
]

export function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⚡</div>
        <div>
          <div className="text-white font-bold text-[14px] leading-tight">2C Electricidad</div>
          <div className="text-slate-400 text-[11px]">Inventario Taller</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(group => (
          <div key={group.section}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-4 pt-3 pb-1">
              {group.section}
            </div>
            {group.links.map(link => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link key={link.href} href={link.href}
                  onClick={onNav}
                  className={`nav-link ${active ? 'active' : ''}`}
                >
                  <span className="text-base leading-none">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </>
  )
}

// Sidebar completo con soporte móvil
export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[300] p-2 bg-slate-800 rounded-lg text-white shadow-lg"
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay móvil */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-[250]" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar escritorio */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-800 fixed top-0 left-0 h-screen z-[200]">
        <SidebarContent />
      </aside>

      {/* Sidebar móvil (drawer) */}
      <aside className={`md:hidden flex flex-col w-56 bg-slate-800 fixed top-0 left-0 h-screen z-[300]
                         transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent onNav={() => setOpen(false)} />
      </aside>
    </>
  )
}
