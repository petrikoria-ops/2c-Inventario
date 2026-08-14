import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import TablaSolicitudesAjuste from '@/components/ajusteInventario/TablaSolicitudesAjuste'
import { redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeCrear, esJefeDeBodegaOGerencia } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ajustes de inventario — 2C Inventario' }

export default async function SolicitudesAjustePage() {
  const sb = getSupabaseServer()
  const [{ data, error }, perfil] = await Promise.all([
    sb.from('solicitudes_ajuste_inventario').select('*').order('creado_en', { ascending: false }),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'solicitudes_ajuste')) redirect('/')

  const puedeSolicitar = !perfil || puedeCrear(perfil, 'solicitudes_ajuste')
  const puedeAprobar    = esJefeDeBodegaOGerencia(perfil)

  const solicitudes = data ?? []
  const pendientes = solicitudes.filter((s: any) => s.estado === 'pendiente').length

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Ajustes de inventario</h1>
          <p className="text-sm text-brand-n500">
            {pendientes > 0 ? <span className="text-yellow-600 font-medium">{pendientes} pendiente{pendientes !== 1 ? 's' : ''} de aprobar</span> : 'Sin solicitudes pendientes'}
          </p>
        </div>
        {puedeSolicitar && <Link href="/solicitudes-ajuste/nueva" className="btn btn-primary">+ Nueva solicitud</Link>}
      </div>

      {error ? (
        <div className="alert alert-red">No se pudo cargar la lista. Si acabas de agregar este módulo, confirma que corriste migration_solicitudes_ajuste_inventario.sql en Supabase.</div>
      ) : (
        <TablaSolicitudesAjuste initialData={solicitudes as any} puedeAprobar={puedeAprobar} />
      )}
    </div>
  )
}
