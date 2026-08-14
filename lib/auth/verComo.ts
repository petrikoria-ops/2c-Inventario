import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, resolverPermisos, PUESTOS_POR_DEPARTAMENTO, type Perfil, type Departamento, type NivelAcceso } from './permisos.server'
import { DEPARTAMENTOS_OPERATIVOS } from './deptInfo'

// Re-export para que el resto del código que ya importa estas constantes
// desde verComo siga funcionando (los Client Components deben importarlas
// directamente desde './deptInfo', que no arrastra next/headers).
export { DEPARTAMENTOS_OPERATIVOS, NOMBRE_DEPARTAMENTO } from './deptInfo'

// "Ver como": el Gerente (master) y el Administrador de software pueden navegar
// TODA la app como la vería un usuario de otro departamento, para evaluar la
// experiencia real de cada área. La elección se guarda en una cookie para que
// persista al cambiar de página (la barra lateral y el inicio se adaptan).
//
// IMPORTANTE: esto solo cambia lo que se VE (navegación, inicio, visibilidad).
// NO cambia los permisos de edición reales: cada API sigue validando con el
// perfil real vía requireCrear()/requireModificar(), así que un admin
// simulando "bodega" sigue pudiendo editar — está evaluando la vista, no
// perdiendo su poder.

export const VER_COMO_COOKIE = 'ver_como'

export function esAdminTotal(perfil: Perfil | null): boolean {
  return perfil?.nivel_acceso === 'master' || perfil?.nivel_acceso === 'admin_software'
}

export interface ContextoUsuario {
  /** perfil real del usuario logueado */
  real: Perfil | null
  /** perfil con el que se renderiza la UI (real, o simulado si "ver como" está activo) */
  efectivo: Perfil | null
  /** ¿este usuario puede usar "ver como"? (master / admin_software) */
  puedeSimular: boolean
  /** departamento simulado activo, o null si está en su propia vista */
  verComo: Departamento | null
}

// Se simula con el puesto de mayor jerarquía del departamento elegido (el
// techo real de esa área — lo útil para evaluar la experiencia), sin llegar
// a master/admin_software (esos bypasean todo y no muestran nada real). Todo
// departamento operativo tiene un puesto 'administrador' (Jefe de
// departamento / Visitador de obra) tras la pirámide de roles — ver
// docs/departamentos/piramide.md.
const ORDEN_NIVEL: Record<NivelAcceso, number> = {
  maestro: 0, modificador: 1, administrador: 2, master: 3, admin_software: 4,
}

function puestoRepresentativo(departamento: Departamento): { puesto: string; nivel: NivelAcceso } {
  const puestos = PUESTOS_POR_DEPARTAMENTO[departamento]
  const jefe = puestos.find(p => p.nivel === 'administrador')
  if (jefe) return jefe
  const candidatos = puestos.filter(p => p.nivel !== 'master' && p.nivel !== 'admin_software')
  return candidatos.reduce((mejor, p) => ORDEN_NIVEL[p.nivel] > ORDEN_NIVEL[mejor.nivel] ? p : mejor, candidatos[0])
}

/**
 * Resuelve el perfil efectivo aplicando la cookie "ver como" si corresponde.
 * Úsalo en layout.tsx y en páginas que adapten su contenido al departamento.
 */
export async function getContextoUsuario(): Promise<ContextoUsuario> {
  const real = await getPerfil()
  const puedeSimular = esAdminTotal(real)

  let verComo: Departamento | null = null
  if (puedeSimular) {
    const raw = cookies().get(VER_COMO_COOKIE)?.value as Departamento | undefined
    if (raw && DEPARTAMENTOS_OPERATIVOS.includes(raw)) verComo = raw
  }

  let efectivo: Perfil | null = real
  if (verComo && real) {
    const { puesto, nivel } = puestoRepresentativo(verComo)
    // Sin usuarioId: la simulación no debe heredar las excepciones
    // personales del admin real, solo lo que le tocaría al puesto.
    const permisos = await resolverPermisos(getSupabaseServer(), verComo, puesto)
    efectivo = { ...real, departamento: verComo, puesto, nivel_acceso: nivel, permisos }
  }

  return { real, efectivo, puedeSimular, verComo }
}
