import { getSupabaseServer } from '@/lib/supabase/server'
import TablaMovimientos from '@/components/movimientos/TablaMovimientos'
import { getPerfil, puedeEditar } from '@/lib/auth/permisos.server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Movimientos — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function MovimientosPage() {
  const sb = getSupabaseServer()
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [{ data: movimientos }, { data: materiales }, { data: proyectos }, perfil] = await Promise.all([
    sb.from('movimientos')
      .select('*,materiales(codigo,descripcion,unidad),proyectos(ot,nombre)')
      .gte('fecha', hace30)
      .order('fecha', { ascending: false })
      .limit(200),
    sb.from('materiales').select('id,codigo,descripcion,stock_actual,unidad').eq('activo', true).order('codigo'),
    sb.from('proyectos').select('id,ot,nombre').in('estado', ['en_proceso','presupuesto']).order('ot'),
    getPerfil(),
  ])

  // Sin perfil (no debería pasar, ver middleware) se deja editar como antes.
  const editable = !perfil || puedeEditar(perfil, 'movimientos')

  return (
    <div className="p-5">
      <TablaMovimientos
        initialData={movimientos ?? []}
        materiales={materiales ?? []}
        proyectos={proyectos ?? []}
        editable={editable}
      />
    </div>
  )
}
