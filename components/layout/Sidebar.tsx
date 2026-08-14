'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Home, LayoutDashboard, MessageCircle, CalendarCheck2,
  Package, Wrench, ArrowUpDown, Upload, PackageOpen, Handshake, HardHat, Users, Bot,
  ClipboardList, Building2, ShoppingCart, ListChecks, ShieldCheck, ShieldAlert, Zap,
  Calculator, CheckSquare, Tag, Menu, X, LogOut, UserCog, AlertOctagon, ChevronDown,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { puedeVer, type Perfil, type Modulo, type Departamento } from '@/lib/auth/permisos'
import { getDeptConfig } from '@/lib/departamentos/config'
import { usePresence } from '@/contexts/PresenceContext'
import VerComoSelector from './VerComoSelector'
import ConectadosDropdown from '@/components/mensajeria/ConectadosDropdown'
import type { LucideIcon } from 'lucide-react'
import type { PerfilDirectorio } from '@/types'

interface NavLink  { href: string; Icon: LucideIcon; label: string; modulo?: Modulo; badge?: number }
interface NavGroup { section: string; links: NavLink[] }

// Iniciales para el avatar del usuario con sesión iniciada (ej. "Ana Torres" → "AT").
function inicialesDe(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

// modulo: undefined = siempre visible para cualquier perfil (ej. Inicio).
const NAV: NavGroup[] = [
  {
    section: 'Principal',
    links: [
      { href: '/',           Icon: Home,             label: 'Inicio' },
      { href: '/mensajes',   Icon: MessageCircle,    label: 'Mensajes' },
      { href: '/itinerario', Icon: CalendarCheck2,   label: 'Itinerario' },
      { href: '/dashboard',  Icon: LayoutDashboard,  label: 'Métricas', modulo: 'metricas' },
    ],
  },
  {
    section: 'Inventario',
    links: [
      { href: '/materiales',   Icon: Package,     label: 'Materiales', modulo: 'materiales' },
      { href: '/herramientas',          Icon: Wrench,    label: 'Herramientas',          modulo: 'herramientas' },
      { href: '/herramientas/entregar', Icon: HardHat,  label: 'Entregar herramientas', modulo: 'herramientas' },
      { href: '/trabajadores',          Icon: Users,    label: 'Trabajadores',          modulo: 'trabajadores' },
      { href: '/movimientos',  Icon: ArrowUpDown,  label: 'Movimientos', modulo: 'movimientos' },
      { href: '/importar',     Icon: Upload,       label: 'Importar',    modulo: 'materiales' },
      { href: '/salidas',         Icon: PackageOpen, label: 'Salidas',           modulo: 'movimientos' },
      { href: '/entregas/nueva', Icon: Handshake,   label: 'Entrega por mano', modulo: 'movimientos' },
    ],
  },
  {
    section: 'Gestión',
    links: [
      { href: '/proyectos',   Icon: ClipboardList, label: 'Obras activas — Tableros', modulo: 'proyectos' },
      { href: '/avance-obra', Icon: ListChecks,    label: 'Avance de obra',     modulo: 'avance_obra' },
      { href: '/verificacion-ric', Icon: ShieldCheck, label: 'Verificación RIC', modulo: 'verificacion_ric' },
      { href: '/pruebas-alimentadores', Icon: Zap, label: 'Test de Alimentadores', modulo: 'pruebas_alimentadores' },
      { href: '/prevencion-riesgos', Icon: ShieldAlert, label: 'Inspección de riesgos', modulo: 'prevencion_riesgos' },
      { href: '/proveedores', Icon: Building2,     label: 'Proveedores', modulo: 'proveedores' },
      { href: '/solicitudes', Icon: ShoppingCart,  label: 'Compras',     modulo: 'compras' },
    ],
  },
  {
    section: 'Recursos',
    links: [
      { href: '/recursos',   Icon: Calculator,   label: 'Recursos Técnicos', modulo: 'recursos_tecnicos' },
      { href: '/checklist',  Icon: CheckSquare,  label: 'Checklist tablero', modulo: 'checklist' },
      { href: '/etiquetas',  Icon: Tag,          label: 'Etiquetas de obra', modulo: 'etiquetas' },
      { href: '/agente',     Icon: Bot,          label: 'Agente IA',         modulo: 'agente' },
    ],
  },
]

export function SidebarContent({ perfil, puedeSimular = false, verComo = null, verComoPuesto = null, erroresPendientes = 0, directorioConectados = [], onNav }: { perfil: Perfil | null; puedeSimular?: boolean; verComo?: Departamento | null; verComoPuesto?: string | null; erroresPendientes?: number; directorioConectados?: PerfilDirectorio[]; onNav?: () => void }) {
  const pathname = usePathname()
  const router    = useRouter()

  // Secciones plegadas por defecto (menos "Principal", siempre a la vista) —
  // así el menú entra en una pantalla sin scroll en vez de listar los ~20
  // enlaces de una vez. Se abren al tocarlas, y la sección de la página en
  // la que estás se fuerza abierta más abajo aunque no la hayas tocado.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const toggleSection = (section: string) =>
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })

  // Navegación según el perfil EFECTIVO (real o simulado). El acceso de admin
  // se evalúa con el perfil REAL para no perder el panel de administración por
  // estar simulando, salvo que se quiera ver la barra tal cual la vería el área.
  const esAdmin = perfil?.nivel_acceso === 'admin_software' || perfil?.nivel_acceso === 'master'
  const cfg = getDeptConfig(perfil?.departamento)
  const DeptIcon = cfg.Icon
  const simulando = !!verComo
  const { noLeidos, tareasPendientes } = usePresence()
  const BADGES: Record<string, number> = { '/mensajes': noLeidos, '/itinerario': tareasPendientes }

  const grupos = NAV
    .map(g => ({
      ...g,
      links: g.links
        .filter(l => !l.modulo || !perfil || puedeVer(perfil, l.modulo))
        .map(l => l.href in BADGES ? { ...l, badge: BADGES[l.href] || undefined } : l),
    }))
    .filter(g => g.links.length > 0)
    .concat(esAdmin ? [{
      section: 'Administración',
      links: [
        { href: '/admin/solicitudes', Icon: UserCog, label: 'Gestión de usuarios' },
        { href: '/admin/permisos', Icon: ShieldCheck, label: 'Permisos' },
        { href: '/admin/errors', Icon: AlertOctagon, label: 'Log de errores', badge: erroresPendientes || undefined },
      ],
    }] : [])

  const esLinkActivo = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href))
  // La sección de la página actual va siempre abierta, aunque el usuario
  // no la haya tocado — si no, aterrizas en una página con su propio
  // enlace escondido dentro de una sección plegada.
  const seccionActiva = grupos.find(g => g.links.some(l => esLinkActivo(l.href)))?.section

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
          <div className="text-[11px] leading-tight truncate" style={{ color: '#6B7480' }}>
            {perfil ? perfil.puesto : 'Inventario General'}
          </div>
        </div>
      </div>

      {/* Identidad del departamento — chip con color del área */}
      {perfil && (
        <Link
          href="/"
          onClick={onNav}
          className={`group flex items-center gap-2.5 mx-3 mt-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 ${simulando ? 'ring-2 ring-[#F0C000]' : ''}`}
          style={{ background: `linear-gradient(120deg, ${cfg.grad[0]}, ${cfg.grad[1]})` }}
        >
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <DeptIcon size={15} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-white/70 leading-none mb-0.5">
              {simulando ? 'Viendo como' : 'Mi área'}
            </div>
            <div className="text-[13px] font-bold text-white leading-tight truncate">{cfg.nombre}</div>
          </div>
          <Home size={13} className="text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
        </Link>
      )}

      {/* Control "Ver como" — solo master / admin_software */}
      {puedeSimular && (
        <VerComoSelector verComo={verComo} verComoPuesto={verComoPuesto} variant="sidebar" onNavigate={onNav} />
      )}

      {/* Quién está conectado — colapsado por defecto, gateado por
          puedeVerConectados dentro del propio componente (jefatura desde
          Visitador de obra hacia arriba). */}
      <ConectadosDropdown directorio={directorioConectados} onNav={onNav} />

      {/* Nav — con degradado inferior que insinúa que hay más opciones al desplazar */}
      <div className="relative flex-1 min-h-0">
        <nav className="h-full overflow-y-auto py-3">
          {grupos.map(group => {
            // "Principal" siempre visible sin botón — es la entrada al resto.
            // El resto se pliega para no listar los ~20 enlaces de una vez.
            const plegable = group.section !== 'Principal'
            const abierta   = !plegable || group.section === seccionActiva || openSections.has(group.section)
            return (
              <div key={group.section} className="mb-1">
                {plegable ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.section)}
                    aria-expanded={abierta}
                    className="w-full flex items-center justify-between gap-1 px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest font-semibold transition-colors hover:text-white"
                    style={{ color: '#4A5260' }}
                  >
                    <span>{group.section}</span>
                    <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <div className="text-[10px] uppercase tracking-widest font-semibold px-4 pt-3 pb-1"
                    style={{ color: '#4A5260' }}>
                    {group.section}
                  </div>
                )}
                {abierta && group.links.map(({ href, Icon, label, badge }) => {
                  const active = esLinkActivo(href)
                  return (
                    <Link key={href} href={href} onClick={onNav}
                      className={`nav-link ${active ? 'active' : ''}`}>
                      <Icon size={15} strokeWidth={2} className="flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {!!badge && <span className="badge badge-red text-[10px] px-1.5">{badge}</span>}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6"
          style={{ background: 'linear-gradient(to bottom, transparent, #2E333A)' }} />
      </div>

      {/* Usuario con sesión iniciada — quién está usando la app en este dispositivo */}
      {perfil && (
        <div className="flex items-center gap-2.5 px-4 py-2 mx-2 mb-1 rounded-md" title={perfil.email}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(120deg, ${cfg.grad[0]}, ${cfg.grad[1]})` }}>
            {inicialesDe(perfil.nombre_completo)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-white leading-tight truncate">{perfil.nombre_completo}</div>
            <div className="text-[10px] leading-tight truncate" style={{ color: '#6B7480' }}>{perfil.email}</div>
          </div>
        </div>
      )}

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

export default function Sidebar({ perfil, puedeSimular = false, verComo = null, verComoPuesto = null, erroresPendientes = 0, directorioConectados = [] }: { perfil: Perfil | null; puedeSimular?: boolean; verComo?: Departamento | null; verComoPuesto?: string | null; erroresPendientes?: number; directorioConectados?: PerfilDirectorio[] }) {
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
        <SidebarContent perfil={perfil} puedeSimular={puedeSimular} verComo={verComo} verComoPuesto={verComoPuesto} erroresPendientes={erroresPendientes} directorioConectados={directorioConectados} />
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
        <SidebarContent perfil={perfil} puedeSimular={puedeSimular} verComo={verComo} verComoPuesto={verComoPuesto} erroresPendientes={erroresPendientes} directorioConectados={directorioConectados} onNav={() => setOpen(false)} />
      </aside>
    </>
  )
}
