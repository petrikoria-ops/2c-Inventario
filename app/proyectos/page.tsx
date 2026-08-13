import { getSupabaseServer } from '@/lib/supabase/server'
import TablaProyectos from '@/components/proyectos/TablaProyectos'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Obras activas — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('proyectos').select('*').order('creado_en', { ascending: false }),
    getPerfil(),
  ])
  if (perfil && !puedeVer(perfil, 'proyectos')) redirect('/')
  const editable = !perfil || puedeEditar(perfil, 'proyectos')
  return <div className="p-5"><TablaProyectos initialData={data ?? []} editable={editable} /></div>
}
