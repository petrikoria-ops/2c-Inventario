import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import FormularioVerificacionRic from '@/components/verificacionRic/FormularioVerificacionRic'

export const dynamic = 'force-dynamic'

export default async function VerificacionRicDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: verificacion }, { data: items }, { data: tableros }, perfil] = await Promise.all([
    sb.from('verificaciones_ric').select('*').eq('id', params.id).single(),
    sb.from('verificaciones_ric_items').select('*').eq('verificacion_id', params.id).order('bloque').order('orden'),
    sb.from('verificaciones_ric_tableros').select('*').eq('verificacion_id', params.id).order('orden'),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'verificacion_ric')) redirect('/')
  if (!verificacion) notFound()

  const editable = !perfil || puedeEditar(perfil, 'verificacion_ric')

  const tableroIds = (tableros ?? []).map(t => t.id)
  const { data: tablerosItems } = tableroIds.length
    ? await sb.from('verificaciones_ric_tableros_items').select('*').in('tablero_entry_id', tableroIds).order('categoria').order('orden')
    : { data: [] }

  const tablerosConItems = (tableros ?? []).map(t => ({
    ...t,
    verificaciones_ric_tableros_items: (tablerosItems ?? []).filter(i => i.tablero_entry_id === t.id),
  }))

  return (
    <FormularioVerificacionRic
      verificacion={verificacion}
      initialItems={items ?? []}
      initialTableros={tablerosConItems}
      editable={editable}
    />
  )
}
