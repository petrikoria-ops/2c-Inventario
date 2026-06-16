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
          .print-doc { box-shadow: none !important; margin: 0 !important; border: none !important; }
          @page { margin: 1.8cm; size: A4; }
        }
        .doc-th {
          background-color: #2E333A;
          color: #9AA3AE;
          padding: 8px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .doc-th-r { text-align: right; }
        .doc-td   { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ECEEF1; }
        .doc-td-r { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ECEEF1; text-align: right; }
      `}</style>

      {/* Barra de acciones */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href="/salidas" className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-slate-500 flex-1">
          Vale de despacho <strong className="text-slate-800">{vale.numero}</strong>
        </span>
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl"
        style={{ border: '1px solid #E2E4E7' }}>

        {/* Encabezado */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-2c.png" alt="2C Montajes" style={{ height: 48, width: 'auto' }} />
            <div>
              <p className="font-bold text-base" style={{ color: '#181818' }}>
                2C MONTAJES Y PROYECTOS ELÉCTRICOS
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#909090' }}>
                Inventario General
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#909090' }}>
              Vale de Despacho
            </p>
            <p className="text-3xl font-bold leading-tight" style={{ color: '#F0C000' }}>
              {vale.numero}
            </p>
            <p className="text-sm mt-1" style={{ color: '#909090' }}>{fechaCorta(vale.fecha)}</p>
          </div>
        </div>

        {/* Línea divisoria carbon */}
        <div style={{ height: 2, backgroundColor: '#2E333A', marginBottom: 24 }} />

        {/* Datos */}
        <div className="grid grid-cols-2 gap-6 mb-7 text-sm">
          {proy && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: '#909090' }}>
                Proyecto / OT
              </p>
              <p className="font-semibold" style={{ color: '#181818' }}>{proy.ot}</p>
              <p style={{ color: '#4A5260' }}>{proy.nombre}</p>
              {proy.cliente && <p style={{ color: '#909090' }}>{proy.cliente}</p>}
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: '#909090' }}>
              Entregado a
            </p>
            <p className="font-semibold" style={{ color: '#181818' }}>{vale.usuario || '—'}</p>
            {vale.motivo && <p style={{ color: '#4A5260' }}>{vale.motivo}</p>}
          </div>
        </div>

        {/* Tabla de ítems */}
        <table className="w-full mb-6" style={{ borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th className="doc-th">Código</th>
              <th className="doc-th">Descripción</th>
              <th className="doc-th doc-th-r">Cant.</th>
              <th className="doc-th">Un.</th>
              {total > 0 && <th className="doc-th doc-th-r">P. Unit.</th>}
              {total > 0 && <th className="doc-th doc-th-r">Subtotal</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                <td className="doc-td" style={{ fontFamily: 'monospace', fontSize: 12, color: '#2E333A', fontWeight: 600 }}>
                  {item.codigo}
                </td>
                <td className="doc-td" style={{ color: '#181818' }}>{item.descripcion}</td>
                <td className="doc-td-r" style={{ fontWeight: 600 }}>{num(item.cantidad_entregada, 2)}</td>
                <td className="doc-td" style={{ color: '#909090', fontSize: 12 }}>{item.unidad}</td>
                {total > 0 && (
                  <td className="doc-td-r" style={{ color: '#909090' }}>{clp(item.precio_unit)}</td>
                )}
                {total > 0 && (
                  <td className="doc-td-r" style={{ fontWeight: 600 }}>
                    {clp(item.cantidad_entregada * (item.precio_unit ?? 0))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#2E333A' }}>
                <td colSpan={total > 0 ? 4 : 4}
                  style={{ padding: '10px 12px', textAlign: 'right', color: '#9AA3AE', fontSize: 13, fontWeight: 600 }}>
                  Total
                </td>
                <td style={{ padding: '10px 12px' }} />
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F0C000', fontSize: 16, fontWeight: 700 }}>
                  {clp(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Observaciones */}
        {vale.observaciones && (
          <div className="mb-8 p-3 rounded-lg text-sm" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
            <strong style={{ color: '#2E333A' }}>Observaciones: </strong>{vale.observaciones}
          </div>
        )}

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          {['Despachado por', 'Recibido por', 'V°B° Supervisor'].map(label => (
            <div key={label} className="text-center">
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
          <span>2C Montajes y Proyectos Eléctricos</span>
          <span>{vale.numero} · {items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          <span>{fechaCorta(vale.fecha)}</span>
        </div>
      </div>
    </>
  )
}
