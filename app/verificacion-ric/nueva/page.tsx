import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'
import NuevaVerificacionRic from '@/components/verificacionRic/NuevaVerificacionRic'

export const metadata = { title: 'Nueva verificación RIC — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevaVerificacionRicPage({ searchParams }: { searchParams: { proyecto?: string } }) {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'verificacion_ric')) redirect('/verificacion-ric')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre,cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot')

  return <NuevaVerificacionRic proyectos={proyectos ?? []} proyectoIdInicial={searchParams.proyecto ?? ''} />
}
