import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import NuevaSolicitud from '@/components/solicitudes/NuevaSolicitud'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Nueva solicitud de compra — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevaSolicitudPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'compras')) redirect('/solicitudes')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('creado_en', { ascending: false })

  return <NuevaSolicitud proyectos={proyectos ?? []} />
}
