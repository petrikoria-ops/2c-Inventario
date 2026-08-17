import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/solicitudes/PrintButton'
import { getSignedUrlsChecklistDrs, getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { ESTILOS_IMPRESION_DOCUMENTO } from '@/components/documentos/estilosDocumento'
import PortadaDocumento from '@/components/documentos/PortadaDocumento'
import { SECCIONES_DRS, SECCION_IMAGENES } from '@/lib/checklistDrs/plantilla'
import type { ChecklistDrsItem } from '@/types'

export const dynamic = 'force-dynamic'

function labelEstado(estado: string | null, labels?: [string, string, string]): string {
  if (!estado) return '—'
  const [pasa, noPasa, na] = labels ?? ['Pasa', 'No pasa', 'N/A']
  return estado === 'pasa' ? pasa : estado === 'no_pasa' ? noPasa : na
}

export default async function ImprimirChecklistDrsPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: checklist, error } = await sb.from('checklists_drs').select('*').eq('id', params.id).single()
  if (error || !checklist) notFound()

  const { data: items } = await sb
    .from('checklists_drs_items')
    .select('*')
    .eq('checklist_id', params.id)
    .order('seccion').order('orden')

  const todosLosItems: ChecklistDrsItem[] = items ?? []
  const paths = todosLosItems.filter(i => i.foto_url).map(i => i.foto_url as string)
  const urls = paths.length ? await getSignedUrlsChecklistDrs(sb, paths) : {}
  const firmaUrl = checklist.firma_imagen_url
    ? await getSignedUrlDeBucket(sb, 'checklists-drs', checklist.firma_imagen_url) : null

  const porSeccion = (id: string) => todosLosItems.filter(i => i.seccion === id).sort((a, b) => a.orden - b.orden)
  const itemsImagenes = porSeccion(SECCION_IMAGENES.id)

  return (
    <>
      <style>{ESTILOS_IMPRESION_DOCUMENTO}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href={`/checklist-drs/${checklist.id}`} className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-brand-n500 flex-1">
          Checklist DRS <strong className="text-slate-800">{checklist.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>

        {/* Portada */}
        <div className="doc-portada" style={{ minHeight: '80vh' }}>
          <PortadaDocumento
            kicker="CHECKLIST DRS — PROTOCOLO DE PRUEBAS DE VERIFICACIÓN INICIAL E INFORME DE IMÁGENES"
            numero={checklist.numero}
            fecha={new Date(checklist.fecha_visita).toLocaleDateString('es-CL')}
            titulo="CHECKLIST DRS"
            subtitulo="Pruebas de verificación inicial e informe de imágenes"
            descripcion="Documento generado a partir del checklist digital de terreno — incluye las mediciones y el registro fotográfico exigidos por DRS."
            campos={[
              { label: 'Proyecto', value: checklist.proyecto_nombre },
              { label: 'Cliente / Mandante', value: checklist.cliente_mandante },
              { label: 'Ubicación', value: checklist.ubicacion },
              { label: 'Fecha de visita', value: new Date(checklist.fecha_visita).toLocaleDateString('es-CL') },
              { label: 'Inspector(es)', value: checklist.inspectores },
              { label: 'N° de tableros', value: checklist.num_tableros },
            ]}
          />
        </div>

        {/* Secciones de medición */}
        {SECCIONES_DRS.map(seccion => {
          const filas = porSeccion(seccion.id).filter(i => i.tipo === 'medicion')
          const fotos = porSeccion(seccion.id).filter(i => i.tipo === 'foto')
          if (!filas.length && !fotos.length) return null
          return (
            <div key={seccion.id} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{seccion.titulo}</p>

              {filas.length > 0 && (
                <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="doc-th">{seccion.columnaEtiqueta}</th>
                      {!seccion.sinValor && <th className="doc-th doc-th-r" style={{ width: 110 }}>{seccion.columnaValor}</th>}
                      {seccion.tieneEstado && <th className="doc-th doc-th-r" style={{ width: 90 }}>Estado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((item, i) => (
                      <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td className="doc-td">
                          {item.etiqueta}
                          {item.referencia && <div className="text-[10px]" style={{ color: '#9AA3AE' }}>{item.referencia}</div>}
                        </td>
                        {!seccion.sinValor && <td className="doc-td-r">{item.valor || '—'}</td>}
                        {seccion.tieneEstado && <td className="doc-td-r" style={{ fontWeight: 600 }}>{labelEstado(item.estado, seccion.labelsEstado)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {fotos.length > 0 && (
                <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                  <thead><tr><th className="doc-th">Registro fotográfico</th><th className="doc-th" style={{ width: 60 }}>Hecho</th><th className="doc-th" style={{ width: 90 }}>Foto</th></tr></thead>
                  <tbody>
                    {fotos.map((item, i) => (
                      <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td className="doc-td">{item.etiqueta}</td>
                        <td className="doc-td">{item.foto_tomada ? '☑' : '☐'}</td>
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
              )}
            </div>
          )
        })}

        {/* Informe de imágenes + Cierre */}
        <div className="doc-cierre">
          <p className="font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{SECCION_IMAGENES.titulo}</p>
          <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
            <thead><tr><th className="doc-th">Foto</th><th className="doc-th" style={{ width: 60 }}>Hecho</th><th className="doc-th" style={{ width: 90 }}>Imagen</th></tr></thead>
            <tbody>
              {itemsImagenes.map((item, i) => (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  <td className="doc-td">{item.etiqueta}</td>
                  <td className="doc-td">{item.foto_tomada ? '☑' : '☐'}</td>
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

          <div className="grid grid-cols-1 gap-1 text-sm mb-4">
            <p><strong style={{ color: '#2E333A' }}>Nombre:</strong> {checklist.firma_nombre ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>RUT:</strong> {checklist.firma_rut ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>Cargo:</strong> {checklist.firma_cargo ?? '—'}</p>
          </div>

          {firmaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmaUrl} alt="Firma" style={{ height: 70, marginBottom: 24 }} />
          )}

          <div className="mt-8 pt-4 flex items-center justify-between text-[10px]" style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
            <span>2C Montajes y Proyectos Eléctricos</span>
            <span>{checklist.numero}</span>
            <span>{new Date(checklist.fecha_visita).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
