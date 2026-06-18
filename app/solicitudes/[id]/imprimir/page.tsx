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

  const fechaLarga = new Date(sol.fecha).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const comprado = solicitud.estado === 'comprado'

  const datosObra = [
    solicitud.obra && ['Obra', solicitud.obra],
    solicitud.supervisor && ['Supervisor de obra', solicitud.supervisor],
    solicitud.visitador && ['Visitador', solicitud.visitador],
    solicitud.fecha_entrega && ['Fecha de entrega', fechaCorta(solicitud.fecha_entrega)],
  ].filter(Boolean) as [string, string][]

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; }
          @page { margin: 1.8cm; size: A4; }
        }
        .doc-th {
          background-color: #2E333A;
          color: #9AA3AE;
          padding: 9px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .doc-th-r { text-align: right; }
        .doc-td   { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #ECEEF1; color: #181818; }
        .doc-td-r { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #ECEEF1; text-align: right; }
        .doc-td-n { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #ECEEF1; color: #909090; text-align: right; tabular-nums: all; }
      `}</style>

      {/* Barra de acciones */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm">
        <Link href="/solicitudes" className="btn btn-ghost btn-sm">← Volver</Link>
        <PrintButton />
        <span className="text-sm text-slate-400 hidden sm:block">
          Tip: en el diálogo de impresión elige "Guardar como PDF"
        </span>
        {!comprado && (
          <Link href="/solicitudes" className="btn btn-outline btn-sm ml-auto">
            Marcar como comprado →
          </Link>
        )}
      </div>

      {/* Documento */}
      <div className="print-doc bg-white max-w-4xl mx-auto my-8 p-10 shadow-lg rounded-xl"
        style={{ border: '1px solid #E2E4E7' }}>

        {/* Encabezado */}
        <div className="flex items-start justify-between pb-6 mb-7"
          style={{ borderBottom: '2px solid #2E333A' }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-2c.png" alt="2C Montajes" style={{ height: 52, width: 'auto' }} />
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: '#181818' }}>
                2C MONTAJES Y PROYECTOS ELÉCTRICOS
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#909090' }}>Inventario General</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#909090' }}>
              Solicitud de Compra
            </p>
            <p className="text-3xl font-bold leading-tight" style={{ color: '#F0C000' }}>
              {solicitud.numero}
            </p>
            <p className="text-sm mt-1" style={{ color: '#909090' }}>Fecha: {fechaLarga}</p>
            <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border ${
              comprado
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {comprado ? '✓ Comprado' : '⏳ Pendiente'}
            </span>
          </div>
        </div>

        {/* Datos de la obra */}
        {datosObra.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-7">
            {datosObra.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#909090' }}>{label}</p>
                <p className="text-sm" style={{ color: '#181818' }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de ítems */}
        <div className="mb-8">
          <table className="w-full" style={{ borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th className="doc-th" style={{ width: 32 }}>#</th>
                <th className="doc-th">Código</th>
                <th className="doc-th">Descripción</th>
                <th className="doc-th doc-th-r">Cantidad</th>
                <th className="doc-th">Unidad</th>
                <th className="doc-th">Proveedor sugerido</th>
                {hayPrecios && <th className="doc-th doc-th-r">P. unitario</th>}
                {hayPrecios && <th className="doc-th doc-th-r">Subtotal</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  <td className="doc-td" style={{ color: '#C0C4CC', fontSize: 11 }}>{i + 1}</td>
                  <td className="doc-td" style={{ fontFamily: 'monospace', fontSize: 12, color: '#2E333A', fontWeight: 600 }}>
                    {item.codigo}
                  </td>
                  <td className="doc-td" style={{ fontWeight: 500 }}>{item.descripcion}</td>
                  <td className="doc-td-r" style={{ fontWeight: 700 }}>{num(item.cantidad_pedida, 2)}</td>
                  <td className="doc-td" style={{ color: '#909090', fontSize: 12 }}>{item.unidad ?? '—'}</td>
                  <td className="doc-td" style={{ color: '#4A5260' }}>{item.proveedor_sugerido ?? '—'}</td>
                  {hayPrecios && (
                    <td className="doc-td-r" style={{ color: '#909090' }}>
                      {item.precio_unitario ? clp(item.precio_unitario) : '—'}
                    </td>
                  )}
                  {hayPrecios && (
                    <td className="doc-td-r" style={{ fontWeight: 600 }}>
                      {item.precio_unitario ? clp(item.precio_unitario * item.cantidad_pedida) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hayPrecios && (
              <tfoot>
                <tr style={{ backgroundColor: '#2E333A' }}>
                  <td colSpan={hayPrecios ? 7 : 5}
                    style={{ padding: '10px 12px', textAlign: 'right', color: '#9AA3AE', fontSize: 13, fontWeight: 600 }}>
                    Total estimado
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F0C000', fontSize: 16, fontWeight: 700 }}>
                    {clp(totalEstimado)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Observaciones */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#909090' }}>
            Observaciones
          </p>
          <div className="p-3 rounded-lg min-h-[52px] text-sm"
            style={{ border: '1px solid #E2E4E7', backgroundColor: '#FAFBFC', color: '#4A5260' }}>
            {solicitud.observaciones || <span style={{ color: '#C0C4CC', fontStyle: 'italic' }}>Sin observaciones</span>}
          </div>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8">
          {['Solicitado por', 'Revisado por', 'Autorizado por'].map(label => (
            <div key={label}>
              <div style={{ borderTop: '2px solid #2E333A', paddingTop: 8, marginTop: 40 }}>
                <p className="text-xs font-semibold" style={{ color: '#2E333A' }}>{label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#C0C4CC' }}>Nombre / Firma / Fecha</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pie */}
        <div className="mt-8 pt-4 flex items-center justify-between text-[10px]"
          style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
          <span>2C Montajes y Proyectos Eléctricos · Sistema de Inventario</span>
          <span>{solicitud.numero} · {items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          <span>{fechaCorta(solicitud.fecha)}</span>
        </div>
      </div>
    </>
  )
}
