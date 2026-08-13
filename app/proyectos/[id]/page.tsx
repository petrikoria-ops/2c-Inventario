import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeEditar, puedeEstructurarAvance } from '@/lib/auth/permisos.server'
import ProyectoHub from '@/components/proyectos/ProyectoHub'

export const dynamic = 'force-dynamic'

export default async function ProyectoDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: proyecto }, { data: trabajadores }, { data: avance }, { data: verificaciones }, perfil] =
    await Promise.all([
      sb.from('proyectos').select('*').eq('id', params.id).single(),
      sb.from('proyectos_trabajadores').select('*,trabajadores(id,nombre,cargo,telefono)').eq('proyecto_id', params.id).eq('activo', true).order('fecha_asignacion', { ascending: false }),
      sb.from('avances_obra').select('*,avances_obra_items(*)').eq('proyecto_id', params.id).maybeSingle(),
      sb.from('verificaciones_ric').select('id,numero,fecha_visita,estado').eq('proyecto_id', params.id).order('fecha_visita', { ascending: false }),
      getPerfil(),
    ])

  if (perfil && !puedeVer(perfil, 'proyectos')) redirect('/')
  if (!proyecto) notFound()

  const editableProyecto = !perfil || puedeEditar(perfil, 'proyectos')
  const editableAvance    = !perfil || puedeEditar(perfil, 'avance_obra')
  const editableRic       = !perfil || puedeEditar(perfil, 'verificacion_ric')
  const puedeEstructurar  = !perfil || puedeEstructurarAvance(perfil)

  return (
    <ProyectoHub
      proyecto={proyecto}
      initialTrabajadores={trabajadores ?? []}
      initialAvance={avance}
      verificaciones={verificaciones ?? []}
      editableProyecto={editableProyecto}
      editableAvance={editableAvance}
      editableRic={editableRic}
      puedeEstructurarAvance={puedeEstructurar}
    />
  )
}
