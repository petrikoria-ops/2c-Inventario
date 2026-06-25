import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import EntregarHerramientas from '@/components/herramientas/EntregarHerramientas'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'

export const dynamic   = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Entregar herramientas | 2C Inventario' }

export default async function EntregarPage() {
  const sb = getSupabaseServer()
  const [{ data: trabajadores }, perfil] = await Promise.all([
    sb.from('trabajadores')
      .select('id, nombre, cargo, rut, telefono, activo, creado_en')
      .eq('activo', true)
      .order('nombre'),
    getPerfil(),
  ])

  // Página dedicada de creación: si no puede editar, no tiene sentido
  // mostrarle el formulario — se redirige al listado en vez de renderizarlo.
  if (perfil && !puedeEditar(perfil, 'herramientas')) redirect('/herramientas')

  return <EntregarHerramientas trabajadores={trabajadores ?? []} />
}
