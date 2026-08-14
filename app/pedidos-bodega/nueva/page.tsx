import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import NuevoPedido from '@/components/pedidosBodega/NuevoPedido'
import { getPerfil, puedeCrear } from '@/lib/auth/permisos.server'

export const metadata = { title: 'Nuevo pedido a bodega — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function NuevoPedidoPage() {
  const perfil = await getPerfil()
  if (perfil && !puedeCrear(perfil, 'pedidos_bodega')) redirect('/pedidos-bodega')

  const sb = getSupabaseServer()
  const { data: proyectos } = await sb
    .from('proyectos')
    .select('id,ot,nombre')
    .in('estado', ['en_proceso', 'presupuesto'])
    .order('creado_en', { ascending: false })

  return <NuevoPedido proyectos={proyectos ?? []} />
}
