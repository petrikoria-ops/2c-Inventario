import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import TablaPruebasAlimentadores from '@/components/pruebasAlimentadores/TablaPruebasAlimentadores'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Test de Alimentadores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function PruebasAlimentadoresPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('pruebas_alimentadores').select('*').order('fecha_visita', { ascending: false }),
    getPerfil(),
  ])
  if (perfil && !puedeVer(perfil, 'pruebas_alimentadores')) redirect('/')
  const editable = !perfil || puedeEditar(perfil, 'pruebas_alimentadores')

  return (
    <div className="p-5 w-full">
      <TablaPruebasAlimentadores initialData={data ?? []} editable={editable} />
    </div>
  )
}
