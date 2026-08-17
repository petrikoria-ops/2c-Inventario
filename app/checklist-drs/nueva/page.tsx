import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'
import NuevoChecklistDrs from '@/components/checklistDrs/NuevoChecklistDrs'

export const metadata = { title: 'Nuevo checklist DRS — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevoChecklistDrsPage({ searchParams }: { searchParams: { proyecto?: string } }) {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'checklist_drs')) redirect('/checklist-drs')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre,cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot')

  return <NuevoChecklistDrs proyectos={proyectos ?? []} proyectoIdInicial={searchParams.proyecto ?? ''} />
}
