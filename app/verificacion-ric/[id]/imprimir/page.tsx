import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/solicitudes/PrintButton'
import { getSignedUrls, getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { ESTILOS_IMPRESION_DOCUMENTO } from '@/components/documentos/estilosDocumento'
import PortadaDocumento from '@/components/documentos/PortadaDocumento'
import { BLOQUES_RIC, A0_COORDINACION, A0_INFORMES_PROPIOS_TERRENO } from '@/lib/verificacionRic/plantilla'
import { ITEMS_CHECKLIST_SAT, getTipoTablero } from '@/lib/verificacionRic/anexoSat'
import type { VerificacionRicItem, VerificacionRicTablero, PruebaAlimentadores } from '@/types'

export const dynamic = 'force-dynamic'

const LABEL_RESULTADO: Record<string, string> = { pasa: 'Pasa', no_pasa: 'No pasa', na: 'N/A' }

export default async function ImprimirVerificacionRicPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: verificacion, error } = await sb.from('verificaciones_ric').select('*').eq('id', params.id).single()
  if (error || !verificacion) notFound()

  const [{ data: items }, { data: tableros }, { data: alimentadores }] = await Promise.all([
    sb.from('verificaciones_ric_items').select('*').eq('verificacion_id', params.id).order('bloque').order('orden'),
    sb.from('verificaciones_ric_tableros').select('*').eq('verificacion_id', params.id).order('orden'),
    sb.from('pruebas_alimentadores').select('id,numero,estado').eq('verificacion_ric_id', params.id),
  ])

  const todosLosItems: VerificacionRicItem[] = items ?? []
  const todosLosTableros: VerificacionRicTablero[] = tableros ?? []
  const alimentadoresVinculados: Pick<PruebaAlimentadores, 'id' | 'numero' | 'estado'>[] = alimentadores ?? []

  const paths = todosLosItems.filter(i => i.foto_url).map(i => i.foto_url as string)
  const pathsTableros = todosLosTableros.filter(t => t.foto_url).map(t => t.foto_url as string)
  const urls = paths.length || pathsTableros.length ? await getSignedUrls(sb, [...paths, ...pathsTableros]) : {}
  const firmaUrl = verificacion.firma_imagen_url
    ? await getSignedUrlDeBucket(sb, 'verificaciones-ric', verificacion.firma_imagen_url) : null

  const porBloque = (id: string) => todosLosItems.filter(i => i.bloque === id).sort((a, b) => a.orden - b.orden)

  return (
    <>
      <style>{ESTILOS_IMPRESION_DOCUMENTO}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href={`/verificacion-ric/${verificacion.id}`} className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-brand-n500 flex-1">
          Verificación RIC <strong className="text-slate-800">{verificacion.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>

        {/* Portada */}
        <div className="doc-portada" style={{ minHeight: '80vh' }}>
          <PortadaDocumento
            kicker="CHECKLIST DE TERRENO — VERIFICACIÓN INICIAL Y PUESTA EN MARCHA (RIC N°18/19)"
            numero={verificacion.numero}
            fecha={new Date(verificacion.fecha_visita).toLocaleDateString('es-CL')}
            titulo="CHECKLIST DE TERRENO"
            subtitulo="Verificación Inicial y Puesta en Marcha — RIC N°18 y N°19"
            descripcion="Documento generado a partir del checklist digital de terreno — incluye las verificaciones, mediciones y registro fotográfico de la visita."
            campos={[
              { label: 'Proyecto', value: verificacion.proyecto_nombre },
              { label: 'Cliente / Mandante', value: verificacion.cliente_mandante },
              { label: 'Ubicación', value: verificacion.ubicacion },
              { label: 'Fecha de visita', value: new Date(verificacion.fecha_visita).toLocaleDateString('es-CL') },
              { label: 'Inspector(es)', value: verificacion.inspectores },
              { label: 'N° de tableros', value: verificacion.num_tableros },
            ]}
          />
        </div>

        {/* Bloques A.0 - A.11 — solo si esta verificación incluye Sección A */}
        {verificacion.incluye_seccion_a && BLOQUES_RIC.filter(b => b.id !== 'CIERRE').map(b => {
          const verif = porBloque(b.id).filter(i => i.tipo === 'verificacion')
          const fotos = porBloque(b.id).filter(i => i.tipo === 'foto')
          const nota  = porBloque(b.id).find(i => i.tipo === 'nota')
          return (
            <div key={b.id} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>
                {b.id} {b.refNormativa && `— ${b.refNormativa}`}: {b.titulo}
              </p>

              {b.id === 'A.0' && (
                <div className="mb-3 text-[11px]" style={{ color: 'var(--n-500)' }}>
                  <table className="w-full mb-2">
                    <thead><tr><th className="text-left pb-1">Oficina Técnica prepara</th><th className="text-left pb-1">Obra / Terreno debe proporcionar</th></tr></thead>
                    <tbody>
                      {A0_COORDINACION.map((row, i) => (
                        <tr key={i} className="align-top"><td className="pr-3 py-0.5">{row.oficinaTecnica}</td><td className="py-0.5">{row.terreno}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p>{A0_INFORMES_PROPIOS_TERRENO}</p>
                </div>
              )}

              {verif.length > 0 && (
                <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                  <thead><tr><th className="doc-th">Verificación</th><th className="doc-th doc-th-r" style={{ width: 90 }}>Resultado</th></tr></thead>
                  <tbody>
                    {verif.map((item, i) => (
                      <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                        <td className="doc-td">{item.texto}</td>
                        <td className="doc-td-r" style={{ fontWeight: 600 }}>{item.resultado ? LABEL_RESULTADO[item.resultado] : '—'}</td>
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
                        <td className="doc-td">{item.texto}</td>
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

              {nota?.notas && (
                <div className="text-xs p-2 rounded" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
                  <strong style={{ color: '#2E333A' }}>Notas: </strong>{nota.notas}
                </div>
              )}
            </div>
          )
        })}

        {/* Registro fotográfico general + Informe de Medición N°1 + Anexo SAT + Cierre */}
        <div className="doc-cierre">
          {verificacion.incluye_seccion_a && (
            <>
              <p className="font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Registro fotográfico general de la visita</p>
              <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
                <thead><tr><th className="doc-th">Foto</th><th className="doc-th" style={{ width: 60 }}>Hecho</th><th className="doc-th" style={{ width: 90 }}>Imagen</th></tr></thead>
                <tbody>
                  {porBloque('CIERRE').map((item, i) => (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="doc-td">{item.texto}</td>
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
            </>
          )}

          {verificacion.incluye_seccion_a && alimentadoresVinculados.length > 0 && (
            <div className="mb-6 text-xs" style={{ color: 'var(--n-500)' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#2E333A' }}>Informe de Medición N°1 — Alimentadores</p>
              <p>Continuidad y aislamiento por alimentador — ver informe(s) aparte: {alimentadoresVinculados.map(a => a.numero).join(', ')}.</p>
            </div>
          )}

          {verificacion.incluye_anexo_sat && todosLosTableros.length > 0 && (
            <div className="mb-6">
              <p className="font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Anexo Opcional — Checklist SAT por tablero</p>
              {todosLosTableros.map(t => (
                <div key={t.id} className="mb-4">
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="doc-th">Tablero N°</th><th className="doc-th">Nombre</th><th className="doc-th">Tipo</th>
                        <th className="doc-th">Fabricante</th><th className="doc-th">Ui</th><th className="doc-th">In</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="doc-td">{t.numero_tablero ?? '—'}</td>
                        <td className="doc-td">{t.nombre}</td>
                        <td className="doc-td">{t.tipo ?? getTipoTablero(t.tipo_tablero_id)?.nombre ?? '—'}</td>
                        <td className="doc-td">{t.fabricante ?? '—'}</td>
                        <td className="doc-td">{t.ui ?? '—'}</td>
                        <td className="doc-td">{t.in_nominal ?? '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead><tr><th className="doc-th">Checklist</th><th className="doc-th doc-th-r" style={{ width: 90 }}>Resultado</th></tr></thead>
                    <tbody>
                      {ITEMS_CHECKLIST_SAT.map((item, i) => (
                        <tr key={item.campo} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                          <td className="doc-td">{item.texto}</td>
                          <td className="doc-td-r" style={{ fontWeight: 600 }}>{t[item.campo] ? LABEL_RESULTADO[t[item.campo] as string] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {t.foto_url && urls[t.foto_url] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[t.foto_url]} alt={`Foto de ${t.nombre}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }} />
                  )}
                  {t.notas && (
                    <div className="text-xs p-2 rounded" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
                      <strong style={{ color: '#2E333A' }}>Notas: </strong>{t.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mb-8 p-3 rounded-lg text-sm" style={{ background: verificacion.declaracion_conformidad ? '#ECFDF5' : '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
            <strong style={{ color: '#2E333A' }}>Declaración de conformidad para energización: </strong>
            {verificacion.declaracion_conformidad ? 'Completada y firmada' : 'Pendiente'}
          </div>

          <div className="grid grid-cols-1 gap-1 text-sm mb-4">
            <p><strong style={{ color: '#2E333A' }}>Nombre:</strong> {verificacion.firma_nombre ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>RUT:</strong> {verificacion.firma_rut ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>Cargo:</strong> {verificacion.firma_cargo ?? '—'}</p>
          </div>

          {firmaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmaUrl} alt="Firma" style={{ height: 70, marginBottom: 24 }} />
          )}

          <div className="mt-8 pt-4 flex items-center justify-between text-[10px]" style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
            <span>2C Montajes y Proyectos Eléctricos</span>
            <span>{verificacion.numero}</span>
            <span>{new Date(verificacion.fecha_visita).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
