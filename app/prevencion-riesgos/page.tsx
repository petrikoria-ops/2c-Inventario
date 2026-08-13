import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import TablaInspeccionesPrevencion from '@/components/prevencion/TablaInspeccionesPrevencion'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Prevención de Riesgos — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function PrevencionRiesgosPage() {
  const sb = getSupabaseServer()
  const [{ data: inspecciones }, { data: items }, perfil] = await Promise.all([
    sb.from('inspecciones_prevencion').select('*').order('fecha', { ascending: false }),
    sb.from('inspecciones_prevencion_items').select('inspeccion_id, resultado').eq('resultado', 'no_cumple'),
    getPerfil(),
  ])
  if (perfil && !puedeVer(perfil, 'prevencion_riesgos')) redirect('/')
  const editable = !perfil || puedeEditar(perfil, 'prevencion_riesgos')

  const conteos: Record<number, number> = {}
  items?.forEach(i => { conteos[i.inspeccion_id] = (conteos[i.inspeccion_id] ?? 0) + 1 })
  const data = (inspecciones ?? []).map(i => ({ ...i, hallazgos_count: conteos[i.id] ?? 0 }))

  return (
    <div className="p-5 w-full">
      <TablaInspeccionesPrevencion initialData={data} editable={editable} />
    </div>
  )
}
