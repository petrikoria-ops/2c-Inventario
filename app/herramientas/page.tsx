import { getSupabaseServer } from '@/lib/supabase/server'
import TablaHerramientas from '@/components/herramientas/TablaHerramientas'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Herramientas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function HerramientasPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('herramientas').select('*').eq('activo', true).order('codigo'),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'herramientas')) redirect('/')

  // Sin perfil (no debería pasar, ver middleware) se deja editar como antes.
  const editable = !perfil || puedeEditar(perfil, 'herramientas')

  return <div className="p-5"><TablaHerramientas initialData={data ?? []} editable={editable} /></div>
}
