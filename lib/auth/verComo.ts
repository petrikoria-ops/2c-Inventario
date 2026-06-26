import { cookies } from 'next/headers'
import { getPerfil, type Perfil, type Departamento, type NivelAcceso } from './permisos.server'
import { DEPARTAMENTOS_OPERATIVOS } from './deptInfo'

// Re-export para que el resto del código que ya importa estas constantes
// desde verComo siga funcionando (los Client Components deben importarlas
// directamente desde './deptInfo', que no arrastra next/headers).
export { DEPARTAMENTOS_OPERATIVOS, NOMBRE_DEPARTAMENTO } from './deptInfo'

// "Ver como": el Dueño (master) y el Administrador de software pueden navegar
// TODA la app como la vería un usuario de otro departamento, para evaluar la
// experiencia real de cada área. La elección se guarda en una cookie para que
// persista al cambiar de página (la barra lateral y el inicio se adaptan).
//
// IMPORTANTE: esto solo cambia lo que se VE (navegación, inicio, visibilidad).
// NO cambia los permisos de edición reales: cada API sigue validando con el
// perfil real vía requireEditable(), así que un admin simulando "bodega"
// sigue pudiendo editar — está evaluando la vista, no perdiendo su poder.

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

  // Se simula a nivel de jefe de departamento: muestra todo lo que esa área
  // puede ver (el alcance máximo del departamento), que es lo útil para evaluar.
  const NIVEL_SIMULADO: NivelAcceso = 'jefe_departamento'
  const efectivo: Perfil | null = verComo && real
    ? { ...real, departamento: verComo, nivel_acceso: NIVEL_SIMULADO }
    : real

  return { real, efectivo, puedeSimular, verComo }
}
