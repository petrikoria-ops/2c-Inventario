import { getSupabaseServer } from '@/lib/supabase/server'
import EntregarHerramientas from '@/components/herramientas/EntregarHerramientas'

export const dynamic   = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Entregar herramientas | 2C Inventario' }

export default async function EntregarPage() {
  const sb = getSupabaseServer()
  const { data: trabajadores } = await sb
    .from('trabajadores')
    .select('id, nombre, cargo, rut, telefono, activo, creado_en')
    .eq('activo', true)
    .order('nombre')

  return <EntregarHerramientas trabajadores={trabajadores ?? []} />
}
