import { Fragment } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/solicitudes/PrintButton'
import { getSignedUrlsPrevencion, getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { ESTILOS_IMPRESION_DOCUMENTO } from '@/components/documentos/estilosDocumento'
import PortadaDocumento from '@/components/documentos/PortadaDocumento'
import { CATEGORIAS_CHECKLIST_FAENA } from '@/lib/prevencion/checklistFaena'
import { NIVELES_RIESGO } from '@/lib/prevencion/clasificacionRiesgo'
import { getMedidaMp } from '@/lib/prevencion/medidasMp'
import BadgeNivel from '@/components/prevencion/BadgeNivel'
import type { InspeccionPrevencionItem } from '@/types'

export const dynamic = 'force-dynamic'

const LABEL_RESULTADO: Record<string, string> = { cumple: 'Cumple', no_cumple: 'No cumple', na: 'N/A' }

export default async function ImprimirInspeccionPrevencionPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: inspeccion, error } = await sb.from('inspecciones_prevencion').select('*').eq('id', params.id).single()
  if (error || !inspeccion) notFound()

  const { data: items } = await sb
    .from('inspecciones_prevencion_items')
    .select('*')
    .eq('inspeccion_id', params.id)
    .order('orden')

  const todosLosItems: InspeccionPrevencionItem[] = items ?? []
  const itemsBase = todosLosItems.filter(i => i.n !== null).sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
  const itemsAdicionales = todosLosItems.filter(i => i.n === null)
  const hallazgos = todosLosItems.filter(i => i.resultado === 'no_cumple')
  const conteoNiveles = NIVELES_RIESGO.map(n => ({ ...n, count: hallazgos.filter(h => h.nivel === n.codigo).length }))

  const paths = todosLosItems.filter(i => i.foto_url).map(i => i.foto_url as string)
  const urls = paths.length ? await getSignedUrlsPrevencion(sb, paths) : {}
  const firmaPrevencionistaUrl = inspeccion.firma_prevencionista_imagen_url
    ? await getSignedUrlDeBucket(sb, 'prevencion-riesgos', inspeccion.firma_prevencionista_imagen_url) : null
  const firmaEncargadoUrl = inspeccion.firma_encargado_imagen_url
    ? await getSignedUrlDeBucket(sb, 'prevencion-riesgos', inspeccion.firma_encargado_imagen_url) : null

  return (
    <>
      <style>{ESTILOS_IMPRESION_DOCUMENTO}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href={`/prevencion-riesgos/${inspeccion.id}`} className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-brand-n500 flex-1">
          Inspección de faena <strong className="text-slate-800">{inspeccion.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>

        <div className="doc-portada" style={{ minHeight: '80vh' }}>
          <PortadaDocumento
            kicker="INSPECCIÓN DE FAENA — CHECKLIST DS N°594"
            numero={inspeccion.numero}
            fecha={new Date(inspeccion.fecha).toLocaleDateString('es-CL')}
            titulo="INSPECCIÓN DE FAENA"
            subtitulo="Checklist de condiciones sanitarias y ambientales básicas"
            descripcion="Verificación de las condiciones de riesgo eléctrico, infraestructura, orden y aseo, bienestar e higiene, y emergencia de la faena, según DS N°594 del MINSAL."
            campos={[
              { label: 'Centro de trabajo / Faena', value: inspeccion.centro_trabajo },
              { label: 'Mandante', value: inspeccion.mandante },
              { label: 'Dirección', value: [inspeccion.direccion, inspeccion.comuna].filter(Boolean).join(', ') || null },
              { label: 'Prevencionista', value: inspeccion.prevencionista },
              { label: 'N° trabajadores', value: inspeccion.n_trabajadores },
              { label: 'Lugares inspeccionados', value: inspeccion.lugares_inspeccionados },
            ]}
          />
        </div>

        {/* Resumen de hallazgos por nivel */}
        <div className="doc-bloque mb-7">
          <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Resumen de hallazgos</p>
          <div className="flex flex-wrap gap-3">
            {conteoNiveles.map(n => (
              <div key={n.codigo} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#E2E4E7' }}>
                <BadgeNivel nivel={n.codigo} />
                <span className="font-semibold" style={{ color: '#181818' }}>{n.count}</span>
                <span className="text-xs" style={{ color: 'var(--n-500)' }}>· {n.plazo}</span>
              </div>
            ))}
            {!hallazgos.length && <p className="text-sm" style={{ color: 'var(--n-500)' }}>Sin hallazgos registrados en esta inspección.</p>}
          </div>
        </div>

        {/* Checklist por categoría */}
        {CATEGORIAS_CHECKLIST_FAENA.map(categoria => {
          const itemsCategoria = itemsBase.filter(i => i.categoria === categoria)
          if (!itemsCategoria.length) return null
          return (
            <div key={categoria} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{categoria}</p>
              <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                <thead><tr><th className="doc-th">Ítem</th><th className="doc-th doc-th-r" style={{ width: 90 }}>Resultado</th></tr></thead>
                <tbody>
                  {itemsCategoria.map((item, i) => (
                    <Fragment key={item.id}>
                      <tr style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td className="doc-td">{item.item}</td>
                        <td className="doc-td-r" style={{ fontWeight: 600 }}>{item.resultado ? LABEL_RESULTADO[item.resultado] : '—'}</td>
                      </tr>
                      {item.resultado === 'no_cumple' && (
                        <tr key={`${item.id}-detalle`} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                          <td className="doc-td" colSpan={2} style={{ paddingTop: 0 }}>
                            <div className="text-xs p-2 rounded flex flex-wrap items-start gap-3" style={{ background: '#FFF7ED', border: '1px solid #FDE4C4' }}>
                              <div className="flex-1 min-w-[200px]">
                                {item.detalle && <p style={{ color: '#4A5260' }}>{item.detalle}</p>}
                                <div className="flex items-center gap-2 mt-1">
                                  <BadgeNivel nivel={item.nivel} />
                                  {item.plazo && <span style={{ color: 'var(--n-500)' }}>Plazo: {item.plazo}</span>}
                                  {item.responsable && <span style={{ color: 'var(--n-500)' }}>· Responsable: {item.responsable}</span>}
                                </div>
                                {!!item.medidas_mp?.length && (
                                  <p className="mt-1" style={{ color: 'var(--n-500)' }}>
                                    Medidas: {item.medidas_mp.map(c => getMedidaMp(c)?.texto ?? c).join(' · ')}
                                  </p>
                                )}
                                {item.medida_texto && <p className="mt-1" style={{ color: 'var(--n-500)' }}>{item.medida_texto}</p>}
                              </div>
                              {item.foto_url && urls[item.foto_url] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={urls[item.foto_url]} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Hallazgos adicionales */}
        {!!itemsAdicionales.length && (
          <div className="doc-bloque mb-7">
            <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Hallazgos adicionales</p>
            <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
              <thead><tr><th className="doc-th">Hallazgo</th><th className="doc-th" style={{ width: 90 }}>Nivel</th><th className="doc-th" style={{ width: 90 }}>Foto</th></tr></thead>
              <tbody>
                {itemsAdicionales.map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                    <td className="doc-td">
                      {item.item}
                      {item.detalle && <p className="mt-0.5" style={{ color: 'var(--n-500)' }}>{item.detalle}</p>}
                    </td>
                    <td className="doc-td"><BadgeNivel nivel={item.nivel} /></td>
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
          </div>
        )}

        {/* Cierre */}
        <div className="doc-cierre">
          {inspeccion.observaciones_generales && (
            <div className="text-xs p-2 rounded mb-8" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
              <strong style={{ color: '#2E333A' }}>Observaciones generales: </strong>{inspeccion.observaciones_generales}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <p className="text-sm mb-2"><strong style={{ color: '#2E333A' }}>Prevencionista:</strong> {inspeccion.firma_prevencionista ?? '—'}</p>
              {firmaPrevencionistaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firmaPrevencionistaUrl} alt="Firma prevencionista" style={{ height: 60 }} />
              )}
            </div>
            <div>
              <p className="text-sm mb-2"><strong style={{ color: '#2E333A' }}>Encargado:</strong> {inspeccion.firma_encargado ?? '—'}</p>
              {firmaEncargadoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firmaEncargadoUrl} alt="Firma encargado" style={{ height: 60 }} />
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 flex items-center justify-between text-[10px]" style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
            <span>2C Montajes y Proyectos Eléctricos</span>
            <span>{inspeccion.numero}</span>
            <span>{new Date(inspeccion.fecha).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
