import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'
import NuevaPruebaAlimentadores from '@/components/pruebasAlimentadores/NuevaPruebaAlimentadores'

export const metadata = { title: 'Nuevo Test de Alimentadores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevaPruebaAlimentadoresPage({ searchParams }: { searchParams: { proyecto?: string; verificacion_ric_id?: string } }) {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'pruebas_alimentadores')) redirect('/pruebas-alimentadores')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre,cliente')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('ot')

  // Si viene desde el panel "Informe de Medición N°1" de una Verificación
  // RIC, el proyecto queda fijo al de esa verificación — un test vinculado
  // tiene que ser de la misma obra.
  let proyectoIdInicial = searchParams.proyecto ?? ''
  let verificacionRicNumero: string | null = null
  if (searchParams.verificacion_ric_id) {
    const { data: verificacion } = await sb
      .from('verificaciones_ric')
      .select('proyecto_id,numero')
      .eq('id', searchParams.verificacion_ric_id)
      .maybeSingle()
    if (verificacion) {
      proyectoIdInicial = String(verificacion.proyecto_id ?? '')
      verificacionRicNumero = verificacion.numero
    }
  }

  return (
    <NuevaPruebaAlimentadores
      proyectos={proyectos ?? []}
      proyectoIdInicial={proyectoIdInicial}
      verificacionRicIdInicial={searchParams.verificacion_ric_id ?? null}
      verificacionRicNumero={verificacionRicNumero}
    />
  )
}
