import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import TablaPedidos from '@/components/pedidosBodega/TablaPedidos'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeCrear, puedeModificar, esJefeDeBodegaOGerencia } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pedidos a bodega — 2C Inventario' }

export default async function PedidosBodegaPage() {
  const sb = getSupabaseServer()
  const [{ data, error }, perfil] = await Promise.all([
    sb.from('pedidos_bodega').select('*, pedidos_bodega_items(id), proyectos(id,ot,nombre)').order('creado_en', { ascending: false }),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'pedidos_bodega')) redirect('/')

  const puedeSolicitar = !perfil || puedeCrear(perfil, 'pedidos_bodega')
  const puedeAprobar    = esJefeDeBodegaOGerencia(perfil)
  const puedeDespachar  = !perfil || puedeModificar(perfil, 'pedidos_bodega')

  const pedidos = data ?? []
  const pendientes = pedidos.filter((p: any) => p.estado === 'pendiente').length

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Pedidos a bodega</h1>
          <p className="text-sm text-brand-n500">
            {pendientes > 0 ? <span className="text-yellow-600 font-medium">{pendientes} pendiente{pendientes !== 1 ? 's' : ''} de aprobar</span> : 'Sin pedidos pendientes'}
          </p>
        </div>
        {puedeSolicitar && <Link href="/pedidos-bodega/nueva" className="btn btn-primary">+ Nuevo pedido</Link>}
      </div>

      {error ? (
        <div className="alert alert-red">No se pudo cargar la lista de pedidos. Si acabas de agregar este módulo, confirma que corriste migration_pedidos_bodega.sql en Supabase.</div>
      ) : (
        <TablaPedidos initialData={pedidos as any} puedeAprobar={puedeAprobar} puedeDespachar={puedeDespachar} />
      )}
    </div>
  )
}
