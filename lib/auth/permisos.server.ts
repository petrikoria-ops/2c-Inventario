import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { puedeEditar, type Modulo, type Perfil } from './permisos'

export * from './permisos'

export async function getPerfil(): Promise<Perfil | null> {
  const sb = getSupabaseServer()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data } = await sb.from('perfiles').select('*').eq('id', auth.user.id).eq('activo', true).maybeSingle()
  return (data as Perfil) ?? null
}

// Para usar al principio de un handler POST/PUT/DELETE de una API route:
//   const denegado = await requireEditable('materiales')
//   if (denegado) return denegado
// Falla cerrado: sin perfil (sesión sin fila en `perfiles`, o usuario
// desactivado) no hay permiso de edición. Las rutas /api/* no pasan por el
// matcher del middleware, así que este es el único punto de control real.
export async function requireEditable(modulo: Modulo): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (!perfil || !puedeEditar(perfil, modulo)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para modificar este módulo.' }, { status: 403 })
  }
  return null
}
