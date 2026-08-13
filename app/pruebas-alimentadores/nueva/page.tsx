import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'
import NuevaPruebaAlimentadores from '@/components/pruebasAlimentadores/NuevaPruebaAlimentadores'

export const metadata = { title: 'Nuevo Test de Alimentadores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevaPruebaAlimentadoresPage({ searchParams }: { searchParams: { proyecto?: string } }) {
  const perfil = await getPerfil()
  if (perfil && !puedeEditar(perfil, 'pruebas_alimentadores')) redirect('/pruebas-alimentadores')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre,cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot')

  return <NuevaPruebaAlimentadores proyectos={proyectos ?? []} proyectoIdInicial={searchParams.proyecto ?? ''} />
}
