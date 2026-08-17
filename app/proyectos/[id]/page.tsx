import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeCrear, puedeEditar, puedeEstructurarAvance, puedeMarcarAvance } from '@/lib/auth/permisos.server'
import ProyectoHub from '@/components/proyectos/ProyectoHub'

export const dynamic = 'force-dynamic'

export default async function ProyectoDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: proyecto }, { data: trabajadores }, { data: avance }, { data: verificaciones }, checklistsDrsRes, tablerosRes, perfil] =
    await Promise.all([
      sb.from('proyectos').select('*').eq('id', params.id).single(),
      sb.from('proyectos_trabajadores').select('*,trabajadores(id,nombre,cargo,telefono)').eq('proyecto_id', params.id).eq('activo', true).order('fecha_asignacion', { ascending: false }),
      sb.from('avances_obra').select('*,avances_obra_items(*)').eq('proyecto_id', params.id).maybeSingle(),
      sb.from('verificaciones_ric').select('id,numero,fecha_visita,estado').eq('proyecto_id', params.id).order('fecha_visita', { ascending: false }),
      sb.from('checklists_drs').select('id,numero,fecha_visita,estado').eq('proyecto_id', params.id).order('fecha_visita', { ascending: false }),
      sb.from('tableros').select('*, tableros_checklist(checks,completado_en)').eq('proyecto_id', params.id).order('creado_en', { ascending: false }),
      getPerfil(),
    ])

  if (perfil && !puedeVer(perfil, 'proyectos')) redirect('/')
  if (!proyecto) notFound()

  const editableProyecto = !perfil || puedeEditar(perfil, 'proyectos')
  const editableAvance    = !perfil || puedeEditar(perfil, 'avance_obra') || puedeMarcarAvance(perfil)
  const editableRic       = !perfil || puedeEditar(perfil, 'verificacion_ric')
  const editableDrs       = !perfil || puedeEditar(perfil, 'checklist_drs')
  const puedeEstructurar  = !perfil || puedeEstructurarAvance(perfil)
  const verTableros       = !perfil || puedeVer(perfil, 'tableros')
  const editableTableros  = !perfil || puedeCrear(perfil, 'tableros') || puedeEditar(perfil, 'tableros')

  // Si migration_tableros.sql / migration_checklist_drs.sql todavía no
  // corrieron en esta base, la tabla no existe y la consulta vuelve con
  // error — se trata como "sin datos" en vez de romper el resto del hub.
  const initialTableros = verTableros ? (tablerosRes.error ? [] : (tablerosRes.data ?? [])) : null
  const checklistsDrs = checklistsDrsRes.error ? [] : (checklistsDrsRes.data ?? [])

  return (
    <ProyectoHub
      proyecto={proyecto}
      initialTrabajadores={trabajadores ?? []}
      initialAvance={avance}
      verificaciones={verificaciones ?? []}
      checklistsDrs={checklistsDrs}
      initialTableros={initialTableros}
      editableProyecto={editableProyecto}
      editableAvance={editableAvance}
      editableRic={editableRic}
      editableDrs={editableDrs}
      editableTableros={editableTableros}
      puedeEstructurarAvance={puedeEstructurar}
    />
  )
}
