import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound }           from 'next/navigation'
import PrintButton            from '@/components/solicitudes/PrintButton'
import { clp, num, fechaCorta } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ImprimirValePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: vale, error } = await sb
    .from('vales_despacho')
    .select('*, proyectos(ot,nombre,cliente), vales_despacho_items(*)')
    .eq('id', params.id)
    .single()

  if (error || !vale) notFound()

  const items: any[] = vale.vales_despacho_items ?? []
  const total = items.reduce((s: number, i: any) => s + (i.cantidad_entregada * (i.precio_unit ?? 0)), 0)
  const proy:  any = vale.proyectos

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-doc { box-shadow: none !important; margin: 0 !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Barra de acciones (no imprime) */}
      <div className="no-print flex items-center gap-3 p-4 bg-slate-100 border-b border-slate-200">
        <a href="/salidas" className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-slate-600 flex-1">Vale de despacho <strong>{vale.numero}</strong></span>
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="print-doc bg-white max-w-3xl mx-auto my-6 p-10 shadow-lg rounded-lg text-slate-800">
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚡</span>
              <span className="font-bold text-xl text-slate-900">2C Electricidad</span>
            </div>
            <p className="text-sm text-slate-500">Taller de Armado de Tableros Eléctricos</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Vale de Despacho</p>
            <p className="text-2xl font-bold text-slate-900">{vale.numero}</p>
            <p className="text-sm text-slate-500">{fechaCorta(vale.fecha)}</p>
          </div>
        </div>

        <hr className="border-slate-200 mb-5" />

        {/* Datos */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          {proy && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Proyecto / OT</p>
              <p className="font-semibold">{proy.ot}</p>
              <p className="text-slate-600">{proy.nombre}</p>
              {proy.cliente && <p className="text-slate-500">{proy.cliente}</p>}
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Entregado a</p>
            <p className="font-semibold">{vale.usuario}</p>
            {vale.motivo && <p className="text-slate-500">{vale.motivo}</p>}
          </div>
        </div>

        {/* Tabla de ítems */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Código</th>
              <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</th>
              <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cant.</th>
              <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Un.</th>
              {total > 0 && <>
                <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">P. Unit</th>
                <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 px-3 font-mono text-xs text-slate-600">{item.codigo}</td>
                <td className="py-2 px-3 text-slate-800">{item.descripcion}</td>
                <td className="py-2 px-3 text-right font-medium">{num(item.cantidad_entregada, 2)}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{item.unidad}</td>
                {total > 0 && <>
                  <td className="py-2 px-3 text-right text-slate-500">{clp(item.precio_unit)}</td>
                  <td className="py-2 px-3 text-right font-medium">{clp(item.cantidad_entregada * (item.precio_unit ?? 0))}</td>
                </>}
              </tr>
            ))}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-300">
                <td colSpan={4} className="py-2 px-3 text-right font-semibold text-slate-600" />
                <td className="py-2 px-3 text-right font-semibold text-slate-600">Total</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{clp(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Observaciones */}
        {vale.observaciones && (
          <div className="mb-8 p-3 bg-slate-50 rounded text-sm text-slate-600">
            <strong className="text-slate-700">Observaciones: </strong>{vale.observaciones}
          </div>
        )}

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8 mt-10 pt-6">
          {['Despachado por', 'Recibido por', 'V°B° Supervisor'].map(label => (
            <div key={label} className="text-center">
              <div className="border-t-2 border-slate-400 pt-2">
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
