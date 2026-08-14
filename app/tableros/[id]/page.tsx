import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeCrear, puedeEditar } from '@/lib/auth/permisos.server'
import TableroDetalle from '@/components/tableros/TableroDetalle'

export const dynamic = 'force-dynamic'

export default async function TableroPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: tablero }, perfil] = await Promise.all([
    sb.from('tableros').select('*, proyectos(id,ot,nombre), tableros_checklist(*)').eq('id', params.id).maybeSingle(),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'tableros')) redirect('/')
  if (!tablero) notFound()

  const editable = !perfil || puedeCrear(perfil, 'tableros') || puedeEditar(perfil, 'tableros')
  const checklistJoin = Array.isArray(tablero.tableros_checklist) ? tablero.tableros_checklist[0] : tablero.tableros_checklist
  // Defensivo: todo tablero creado desde /api/tableros ya trae su fila de
  // checklist, pero uno creado antes de esa lógica (o si el insert falló)
  // no debería tumbar la página — se completa con un checklist vacío.
  const checklist = checklistJoin ?? {
    id: 0, tablero_id: tablero.id, checks: {}, tecnico: null,
    fecha_inspeccion: null, observaciones: null, completado_en: null,
    actualizado_en: tablero.actualizado_en,
  }

  return <TableroDetalle tablero={tablero} checklist={checklist} editable={editable} />
}
