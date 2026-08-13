import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/solicitudes/PrintButton'
import { getSignedUrlsAlimentador, getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { ESTILOS_IMPRESION_DOCUMENTO } from '@/components/documentos/estilosDocumento'
import PortadaDocumento from '@/components/documentos/PortadaDocumento'
import type { PruebaAlimentadoresItem } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ImprimirPruebaAlimentadoresPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: prueba, error } = await sb.from('pruebas_alimentadores').select('*').eq('id', params.id).single()
  if (error || !prueba) notFound()

  const { data: items } = await sb
    .from('pruebas_alimentadores_items')
    .select('*')
    .eq('prueba_id', params.id)
    .order('orden')

  const todosLosItems: PruebaAlimentadoresItem[] = items ?? []
  const paths = todosLosItems.filter(i => i.foto_url).map(i => i.foto_url as string)
  const urls = paths.length ? await getSignedUrlsAlimentador(sb, paths) : {}
  const firmaUrl = prueba.firma_imagen_url ? await getSignedUrlDeBucket(sb, 'pruebas-alimentadores', prueba.firma_imagen_url) : null

  return (
    <>
      <style>{ESTILOS_IMPRESION_DOCUMENTO}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href={`/pruebas-alimentadores/${prueba.id}`} className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-brand-n500 flex-1">
          Test de Alimentadores <strong className="text-slate-800">{prueba.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>

        <div className="doc-portada" style={{ minHeight: '80vh' }}>
          <PortadaDocumento
            kicker="TEST DE ALIMENTADORES — MEDICIÓN DE AISLAMIENTO Y CONTINUIDAD"
            numero={prueba.numero}
            fecha={new Date(prueba.fecha_visita).toLocaleDateString('es-CL')}
            titulo="TEST DE ALIMENTADORES"
            subtitulo="Mediciones entre fases, neutro y tierra"
            descripcion="Registro de las mediciones tomadas entre cada par de conductores del alimentador indicado, con su respaldo fotográfico correspondiente."
            campos={[
              { label: 'Proyecto', value: prueba.proyecto_nombre },
              { label: 'Cliente / Mandante', value: prueba.cliente_mandante },
              { label: 'Ubicación', value: prueba.ubicacion },
              { label: 'Alimentador / tablero', value: prueba.identificacion_alimentador },
              { label: 'Inspector(es)', value: prueba.inspectores },
              { label: 'Instrumento', value: prueba.instrumento },
            ]}
          />
        </div>

        <div className="doc-cierre">
          <p className="font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Mediciones</p>
          <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="doc-th">Medición</th>
                <th className="doc-th doc-th-r" style={{ width: 110 }}>Valor</th>
                <th className="doc-th" style={{ width: 90 }}>Foto</th>
              </tr>
            </thead>
            <tbody>
              {todosLosItems.map((item, i) => (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  <td className="doc-td">{item.texto}</td>
                  <td className="doc-td-r" style={{ fontWeight: 600 }}>{item.valor || '—'}</td>
                  <td className="doc-td">
                    {item.foto_url && urls[item.foto_url] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urls[item.foto_url]} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {prueba.observaciones && (
            <div className="text-xs p-2 rounded mb-8" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
              <strong style={{ color: '#2E333A' }}>Observaciones: </strong>{prueba.observaciones}
            </div>
          )}

          <div className="grid grid-cols-1 gap-1 text-sm mb-4">
            <p><strong style={{ color: '#2E333A' }}>Nombre:</strong> {prueba.firma_nombre ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>RUT:</strong> {prueba.firma_rut ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>Cargo:</strong> {prueba.firma_cargo ?? '—'}</p>
          </div>

          {firmaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmaUrl} alt="Firma" style={{ height: 70, marginBottom: 24 }} />
          )}

          <div className="mt-8 pt-4 flex items-center justify-between text-[10px]" style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
            <span>2C Montajes y Proyectos Eléctricos</span>
            <span>{prueba.numero}</span>
            <span>{new Date(prueba.fecha_visita).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
