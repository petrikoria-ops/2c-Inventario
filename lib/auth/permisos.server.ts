import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { puedeEditar, type Modulo, type Perfil } from './permisos'

export * from './permisos'

export async function getPerfil(): Promise<Perfil | null> {
  const sb = getSupabaseServer()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data } = await sb.from('perfiles').select('*').eq('id', auth.user.id).maybeSingle()
  return (data as Perfil) ?? null
}

// Para usar al principio de un handler POST/PUT/DELETE de una API route:
//   const denegado = await requireEditable('materiales')
//   if (denegado) return denegado
// Perfiles inexistentes (usuarios de antes del sistema de roles) no se
// bloquean — el middleware ya los confina a /pendiente-aprobacion antes
// de que puedan llegar a llamar ninguna API protegida por sesión normal.
export async function requireEditable(modulo: Modulo): Promise<NextResponse | null> {
  const perfil = await getPerfil()
  if (perfil && !puedeEditar(perfil, modulo)) {
    return NextResponse.json({ error: 'Tu perfil no tiene permiso para modificar este módulo.' }, { status: 403 })
  }
  return null
}
