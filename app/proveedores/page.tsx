import { getSupabaseServer } from '@/lib/supabase/server'
import TablaProveedores from '@/components/proveedores/TablaProveedores'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Proveedores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('proveedores').select('*').eq('activo', true).order('nombre'),
    getPerfil(),
  ])

  // Sin perfil (no debería pasar, ver middleware) se deja editar como antes.
  const editable = !perfil || puedeEditar(perfil, 'proveedores')

  return <div className="p-5"><TablaProveedores initialData={data ?? []} editable={editable} /></div>
}
