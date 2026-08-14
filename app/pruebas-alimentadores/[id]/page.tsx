import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import FormularioPruebaAlimentadores from '@/components/pruebasAlimentadores/FormularioPruebaAlimentadores'

export const dynamic = 'force-dynamic'

export default async function PruebaAlimentadoresDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: prueba }, { data: alimentadores }, { data: items }, perfil] = await Promise.all([
    sb.from('pruebas_alimentadores').select('*').eq('id', params.id).single(),
    sb.from('pruebas_alimentadores_alimentadores').select('*').eq('prueba_id', params.id).order('orden'),
    sb.from('pruebas_alimentadores_items').select('*').eq('prueba_id', params.id).order('orden'),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'pruebas_alimentadores')) redirect('/')
  if (!prueba) notFound()

  const editable = !perfil || puedeEditar(perfil, 'pruebas_alimentadores')

  const alimentadoresConItems = (alimentadores ?? []).map(a => ({
    ...a,
    pruebas_alimentadores_items: (items ?? []).filter(i => i.alimentador_id === a.id),
  }))

  return (
    <FormularioPruebaAlimentadores
      prueba={prueba}
      initialAlimentadores={alimentadoresConItems}
      editable={editable}
    />
  )
}
