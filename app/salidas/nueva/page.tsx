import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import NuevaSalida from '@/components/salidas/NuevaSalida'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export default async function NuevaSalidaPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeEditar(perfil, 'movimientos')) redirect('/salidas')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('creado_en', { ascending: false })
  return <NuevaSalida proyectos={proyectos ?? []} />
}
