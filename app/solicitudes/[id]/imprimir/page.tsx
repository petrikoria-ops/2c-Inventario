import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fechaCorta, clp, num } from '@/lib/utils'
import PrintButton from '@/components/solicitudes/PrintButton'
import type { SolicitudCompra, SolicitudCompraItem } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ImprimirPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: sol, error } = await sb
    .from('solicitudes_compra')
    .select('*, solicitudes_compra_items(*)')
    .eq('id', params.id)
    .single()

  if (error || !sol) notFound()

  const solicitud = sol as SolicitudCompra
  const items     = (sol.solicitudes_compra_items ?? []) as SolicitudCompraItem[]

  const totalEstimado = items.reduce(
    (acc, i) => acc + (i.precio_unitario ?? 0) * i.cantidad_pedida, 0
  )
  const hayPrecios = totalEstimado > 0

  // Fecha larga en español
  const fechaLarga = new Date(sol.fecha).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      {/* CSS de impresión: oculta sidebar, botones y muestra solo el documento */}
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Barra de acciones — oculta al imprimir */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm">
        <Link href="/solicitudes" className="btn btn-ghost btn-sm">← Volver</Link>
        <PrintButton />
        <span className="text-sm text-slate-400">
          Tip: en el diálogo de impresión elige "Guardar como PDF" para generar el archivo
        </span>
        {solicitud.estado === 'pendiente' && (
          <Link href="/solicitudes" className="btn btn-outline btn-sm ml-auto text-green-700 border-green-300 hover:bg-green-50">
            Ir a marcar como comprado →
          </Link>
        )}
      </div>

      {/* ─── DOCUMENTO ─────────────────────────────────────────── */}
      <div className="print-doc p-8 max-w-4xl mx-auto my-6 bg-white rounded-xl shadow-md">

        {/* Encabezado */}
        <div className="flex items-start justify-between pb-5 mb-6 border-b-2 border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl leading-none">⚡</span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">2C ELECTRICIDAD</h1>
                <p className="text-sm text-slate-500">Taller de Tableros Eléctricos</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-0.5">Solicitud de compra</p>
            <p className="text-3xl font-bold text-blue-700 leading-tight">{solicitud.numero}</p>
            <p className="text-sm text-slate-500 mt-1">Fecha: {fechaLarga}</p>
            <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-sm font-semibold border
              ${solicitud.estado === 'comprado'
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
              {solicitud.estado === 'comprado' ? '✓ Comprado' : '⏳ Pendiente'}
            </span>
          </div>
        </div>

        {/* Tabla de ítems */}
        <div className="mb-7">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="px-3 py-2 font-semibold w-8">#</th>
                <th className="px-3 py-2 font-semibold">Código</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                <th className="px-3 py-2 font-semibold">Unidad</th>
                <th className="px-3 py-2 font-semibold">Proveedor sugerido</th>
                {hayPrecios && <th className="px-3 py-2 font-semibold text-right">P. unitario</th>}
                {hayPrecios && <th className="px-3 py-2 font-semibold text-right">Subtotal</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-800">{item.codigo}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{item.descripcion}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                    {num(item.cantidad_pedida, 2)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{item.unidad ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{item.proveedor_sugerido ?? '—'}</td>
                  {hayPrecios && (
                    <td className="px-3 py-2 text-right text-slate-500">
                      {item.precio_unitario ? clp(item.precio_unitario) : '—'}
                    </td>
                  )}
                  {hayPrecios && (
                    <td className="px-3 py-2 text-right font-medium text-slate-800">
                      {item.precio_unitario
                        ? clp(item.precio_unitario * item.cantidad_pedida)
                        : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hayPrecios && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400">
                  <td colSpan={hayPrecios ? 7 : 5} className="px-3 py-2.5 text-right font-bold text-slate-700">
                    Total estimado:
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900 text-base">
                    {clp(totalEstimado)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Observaciones */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Observaciones
          </h3>
          <div className="border border-slate-300 rounded-lg p-3 min-h-[56px] text-sm text-slate-600 bg-white">
            {solicitud.observaciones || <span className="text-slate-300 italic">Sin observaciones</span>}
          </div>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8 mt-12 pt-4">
          {['Solicitado por', 'Revisado por', 'Autorizado por'].map(label => (
            <div key={label}>
              <div className="border-t-2 border-slate-400 pt-2 mt-10">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xs text-slate-300 mt-0.5">Nombre / Firma / Fecha</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>2C Electricidad · Sistema de Inventario</span>
          <span>{solicitud.numero} · {items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          <span>
            {new Date().toLocaleDateString('es-CL', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </>
  )
}
