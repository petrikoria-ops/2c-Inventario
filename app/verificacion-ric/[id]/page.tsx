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

  return (
    <FormularioVerificacionRic
      verificacion={verificacion}
      initialItems={items ?? []}
      initialTableros={tableros ?? []}
      editable={editable}
    />
  )
}
