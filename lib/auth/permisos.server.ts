import { cache } from 'react'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServer } from '@/lib/supabase/server'
import { puedeCrear, puedeModificar, puedeEliminar, type Departamento, type Modulo, type Perfil, type MapaPermisos } from './permisos'

export * from './permisos'

// Una fila de excepción individual, tal como sale de permisos_usuario_overrides.
export interface OverridePermiso {
  modulo: string
  ver: boolean | null
  crear: boolean | null
  modificar: boolean | null
  eliminar: boolean | null
}

// Resuelve el mapa ver/crear/modificar efectivo para un (departamento,
// puesto): trae la fila base de permisos_puesto y, si se pasa usuarioId,
// aplica encima las excepciones individuales de permisos_usuario_overrides
// (solo pisan el campo que no sea NULL — NULL = hereda del puesto).
//
// `overridesPrecargados` evita una consulta: quien ya pidió las excepciones
// del usuario por su cuenta (ver fetchPerfil, que las pide en paralelo con
// el perfil) las pasa hechas en vez de que se vuelvan a buscar aquí.
export async function resolverPermisos(
  sb: SupabaseClient,
  departamento: Departamento,
  puesto: string,
  usuarioId?: string,
  overridesPrecargados?: OverridePermiso[],
): Promise<MapaPermisos> {
  const mapa: MapaPermisos = {}

  const { data: filas } = await sb
    .from('permisos_puesto')
    .select('modulo,ver,crear,modificar,eliminar')
    .eq('departamento', departamento)
    .eq('puesto', puesto)

  filas?.forEach(f => {
    mapa[f.modulo as Modulo] = { ver: f.ver, crear: f.crear, modificar: f.modificar, eliminar: f.eliminar }
  })

  let overrides: OverridePermiso[] | null | undefined = overridesPrecargados
  if (!overrides && usuarioId) {
    const { data } = await sb
      .from('permisos_usuario_overrides')
      .select('modulo,ver,crear,modificar,eliminar')
      .eq('usuario_id', usuarioId)
    overrides = data as OverridePermiso[] | null
  }

  overrides?.forEach(o => {
    const base = mapa[o.modulo as Modulo] ?? { ver: false, crear: false, modificar: false, eliminar: false }
    mapa[o.modulo as Modulo] = {
      ver: o.ver ?? base.ver,
      crear: o.crear ?? base.crear,
      modificar: o.modificar ?? base.modificar,
      eliminar: o.eliminar ?? base.eliminar,
    }
  })

  return mapa
}

// Antes esto encadenaba 4 viajes a Supabase, uno detrás de otro:
// auth.getUser() → perfiles → permisos_puesto → permisos_usuario_overrides.
// Como corre en el render de casi toda página, esos 4 saltos de red se
// sumaban al tiempo de cada cambio de pestaña.
//
// El perfil y las excepciones individuales solo dependen del id del usuario,
// así que se piden JUNTOS. permisos_puesto sí necesita el departamento y el
// puesto (que salen del perfil), así que queda después. Total: 3 saltos en
// serie en vez de 4, sin cambiar en nada el resultado.
async function fetchPerfil(): Promise<Perfil | null> {
  const sb = getSupabaseServer()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const uid = auth.user.id

  const [perfilRes, overridesRes] = await Promise.all([
    sb.from('perfiles').select('*').eq('id', uid).eq('activo', true).maybeSingle(),
    sb.from('permisos_usuario_overrides').select('modulo,ver,crear,modificar,eliminar').eq('usuario_id', uid),
  ])

  const data = perfilRes.data
  if (!data) return null

  const permisos = await resolverPermisos(
    sb, data.departamento, data.puesto, uid, (overridesRes.data ?? []) as OverridePermiso[],
  )
  return { ...data, permisos } as Perfil
}

// Memoizado con React cache(): layout.tsx, cada page.tsx y los Server
// Components anidados (Widgets del hub, etc.) llaman getPerfil() por su
// cuenta — sin esto, cada llamada repetía las mismas 4 consultas a Supabase
// (auth.getUser + perfiles + permisos_puesto + permisos_usuario_overrides).
// cache() las reduce a una sola ejecución por request; una request nueva
// arranca con la caché vacía, así que no hay riesgo de mezclar perfiles
// entre usuarios distintos.
export const getPerfil = cache(fetchPerfil)

// Para usar al principio de un handler POST de una API route que crea un
// registro nuevo (colección, ej. /api/verificacion-ric):
//   const denegado = await requireCrear('verificacion_ric')
//   if (denegado) return denegado
export async function requireCrear(modulo: Modulo): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (!perfil || !puedeCrear(perfil, modulo)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para crear en este módulo.' }, { status: 403 })
  }
  return null
}

// Para usar al principio de un handler PATCH/PUT/DELETE de una API route
// que modifica o elimina un registro existente (ej. /api/verificacion-ric/[id]):
//   const denegado = await requireModificar('verificacion_ric')
//   if (denegado) return denegado
// Falla cerrado: sin perfil (sesión sin fila en `perfiles`, o usuario
// desactivado) no hay permiso de escritura. Las rutas /api/* no pasan por el
// matcher del middleware, así que este es el único punto de control real.
export async function requireModificar(modulo: Modulo): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (!perfil || !puedeModificar(perfil, modulo)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para modificar este módulo.' }, { status: 403 })
  }
  return null
}

// Para las rutas DELETE que deben exigir el permiso "eliminar" separado de
// "modificar" (Supervisor puede modificar/agregar sin poder borrar, salvo
// en los módulos donde el dueño le habilite `eliminar` desde /admin/permisos):
//   const denegado = await requireEliminar('materiales')
//   if (denegado) return denegado
export async function requireEliminar(modulo: Modulo): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (!perfil || !puedeEliminar(perfil, modulo)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para eliminar en este módulo.' }, { status: 403 })
  }
  return null
}

// Alias — mismo significado que antes (ver comentario en permisos.ts).
export const requireEditable = requireModificar

// Para las rutas de administración (gestión de usuarios, permisos): solo
// admin_software / master. Centraliza el chequeo que antes se repetía
// inline en cada route.ts de /api/admin/* y en cada page.tsx de /admin/*.
export async function requireAdmin(): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  return null
}
