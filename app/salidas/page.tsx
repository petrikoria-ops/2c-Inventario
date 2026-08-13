import { getSupabaseServer } from '@/lib/supabase/server'
import TablaSalidas from '@/components/salidas/TablaSalidas'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Salidas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function SalidasPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb
      .from('vales_despacho')
      .select('*, proyectos(ot,nombre), vales_despacho_items(id)')
      .order('fecha', { ascending: false })
      .limit(100),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'movimientos')) redirect('/')

  // Sin perfil (no debería pasar, ver middleware) se deja editar como antes.
  const editable = !perfil || puedeEditar(perfil, 'movimientos')

  return <div className="p-5"><TablaSalidas initialData={data ?? []} editable={editable} /></div>
}
