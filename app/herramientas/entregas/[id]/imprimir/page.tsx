import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound }           from 'next/navigation'
import PrintButton            from '@/components/solicitudes/PrintButton'
import { fechaCorta }         from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ImprimirEntregaHerPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: entrega, error } = await sb
    .from('entregas_herramientas')
    .select('*, entregas_herramientas_items(*), trabajadores(nombre,cargo,rut)')
    .eq('id', params.id)
    .single()

  if (error || !entrega) notFound()

  const items: any[] = entrega.entregas_herramientas_items ?? []
  const trab:  any   = entrega.trabajadores

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
        .doc-td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ECEEF1; }
      `}</style>

      {/* Barra acciones */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href="/herramientas" className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-slate-500 flex-1">
          Entrega de herramientas <strong className="text-slate-800">{entrega.numero}</strong>
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
              <p className="text-xs mt-0.5" style={{ color: '#909090' }}>Inventario General</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#909090' }}>
              Entrega de Herramientas
            </p>
            <p className="text-3xl font-bold leading-tight" style={{ color: '#F0C000' }}>
              {entrega.numero}
            </p>
            <p className="text-sm mt-1" style={{ color: '#909090' }}>{fechaCorta(entrega.fecha)}</p>
          </div>
        </div>

        <div style={{ height: 2, backgroundColor: '#2E333A', marginBottom: 24 }} />

        {/* Datos trabajador */}
        <div className="grid grid-cols-2 gap-6 mb-7 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: '#909090' }}>
              Entregado a
            </p>
            <p className="font-semibold text-base" style={{ color: '#181818' }}>{entrega.trabajador_nombre}</p>
            {trab?.cargo && <p style={{ color: '#4A5260' }}>{trab.cargo}</p>}
            {trab?.rut   && <p style={{ color: '#909090' }}>RUT: {trab.rut}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: '#909090' }}>
              Despachado por
            </p>
            <p className="font-semibold" style={{ color: '#181818' }}>{entrega.usuario || '—'}</p>
          </div>
        </div>

        {/* Tabla herramientas */}
        <table className="w-full mb-6" style={{ borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th className="doc-th">Código</th>
              <th className="doc-th">Descripción</th>
              <th className="doc-th">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                <td className="doc-td" style={{ fontFamily: 'monospace', fontSize: 12, color: '#2E333A', fontWeight: 600 }}>
                  {item.codigo}
                </td>
                <td className="doc-td" style={{ color: '#181818' }}>{item.descripcion}</td>
                <td className="doc-td" style={{ color: '#909090', fontSize: 12 }}>{item.notas ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Observaciones generales */}
        {entrega.observaciones && (
          <div className="mb-8 p-3 rounded-lg text-sm" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
            <strong style={{ color: '#2E333A' }}>Observaciones: </strong>{entrega.observaciones}
          </div>
        )}

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          {['Entregado por', 'Recibido por', 'V°B° Supervisor'].map(label => (
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
          <span>{entrega.numero} · {items.length} herramienta{items.length !== 1 ? 's' : ''}</span>
          <span>{fechaCorta(entrega.fecha)}</span>
        </div>
      </div>
    </>
  )
}
