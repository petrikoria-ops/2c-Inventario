import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSignedUrlDeBucket } from '@/lib/supabase/storage'
import { CONFIG_MODULOS_PUBLICOS, esModuloPublico } from '@/lib/enlacesPublicos/modulos'
import { ESTILOS_IMPRESION_DOCUMENTO } from '@/components/documentos/estilosDocumento'
import PortadaDocumento from '@/components/documentos/PortadaDocumento'
import PrintButton from '@/components/solicitudes/PrintButton'
import { BLOQUES_RIC } from '@/lib/verificacionRic/plantilla'
import { ITEMS_CHECKLIST_SAT, getTipoTablero } from '@/lib/verificacionRic/anexoSat'
import { SECCIONES_DRS, SECCION_IMAGENES } from '@/lib/checklistDrs/plantilla'
import { CATEGORIAS_CHECKLIST_FAENA } from '@/lib/prevencion/checklistFaena'
import type { ModuloPublico } from '@/types'

export const dynamic = 'force-dynamic'

const TITULOS: Record<string, { kicker: string; titulo: string; subtitulo: string }> = {
  verificacion_ric: { kicker: 'CHECKLIST DE TERRENO — VERIFICACIÓN RIC N°18/19', titulo: 'CHECKLIST DE TERRENO', subtitulo: 'Verificación Inicial y Puesta en Marcha — RIC N°18 y N°19' },
  checklist_drs: { kicker: 'PROTOCOLO DE PRUEBAS DE VERIFICACIÓN — DRS', titulo: 'CHECKLIST DRS', subtitulo: 'Protocolo de pruebas de verificación inicial e informe de imágenes' },
  prevencion_riesgos: { kicker: 'INSPECCIÓN DE FAENA — CHECKLIST DS 594', titulo: 'INSPECCIÓN DE FAENA', subtitulo: 'Checklist de prevención de riesgos — DS 594' },
  pruebas_alimentadores: { kicker: 'TEST DE ALIMENTADORES', titulo: 'TEST DE ALIMENTADORES', subtitulo: 'Mediciones de continuidad y aislamiento por alimentador' },
}

const LABEL_RESULTADO: Record<string, string> = { pasa: 'Pasa', no_pasa: 'No pasa', na: 'N/A', cumple: 'Cumple', no_cumple: 'No cumple' }

export default async function ResultadoPublicoPage({ params }: { params: { token: string } }) {
  const sb = getSupabaseAdmin()
  const { data: enlace } = await sb.from('enlaces_publicos').select('*').eq('token', params.token).maybeSingle()
  if (!enlace || !esModuloPublico(enlace.modulo)) notFound()

  const modulo = enlace.modulo as ModuloPublico
  const config = CONFIG_MODULOS_PUBLICOS[modulo]
  const { data: cabecera } = await sb.from(config.tabla).select('*').eq('id', enlace.registro_id).maybeSingle()
  if (!cabecera) notFound()

  let items: Record<string, any>[] = []
  let alimentadores: (Record<string, any> & { items: Record<string, any>[] })[] = []
  let tableros: Record<string, any>[] = []
  if (modulo === 'verificacion_ric') {
    const { data } = await sb.from('verificaciones_ric_tableros').select('*').eq('verificacion_id', enlace.registro_id).order('orden')
    tableros = data ?? []
  }
  if (modulo === 'pruebas_alimentadores') {
    const [{ data: alims }, { data: todosLosItems }] = await Promise.all([
      sb.from('pruebas_alimentadores_alimentadores').select('*').eq('prueba_id', enlace.registro_id).order('orden'),
      sb.from(config.tablaItems).select('*').eq(config.fkItems, enlace.registro_id).order('orden'),
    ])
    alimentadores = (alims ?? []).map(a => ({ ...a, items: (todosLosItems ?? []).filter(i => i.alimentador_id === a.id) }))
  } else {
    const { data } = await sb.from(config.tablaItems).select('*').eq(config.fkItems, enlace.registro_id).order('orden')
    items = data ?? []
  }

  const paths = new Set<string>()
  items.forEach(i => { if (i.foto_url) paths.add(i.foto_url) })
  alimentadores.forEach(a => a.items.forEach(i => { if (i.foto_url) paths.add(i.foto_url) }))
  tableros.forEach(t => { if (t.foto_url) paths.add(t.foto_url) })
  for (const campo of config.camposCabeceraEditables) {
    if (campo.endsWith('_imagen_url') && cabecera[campo]) paths.add(cabecera[campo])
  }
  const urls: Record<string, string> = {}
  await Promise.all(Array.from(paths).map(async path => {
    const url = await getSignedUrlDeBucket(sb, config.bucket, path)
    if (url) urls[path] = url
  }))

  const info = TITULOS[modulo]
  const fecha = cabecera.fecha_visita ?? cabecera.fecha
  const porBloque = (id: string) => items.filter(i => i.bloque === id).sort((a, b) => a.orden - b.orden)
  const porSeccion = (id: string) => items.filter(i => i.seccion === id).sort((a, b) => a.orden - b.orden)

  return (
    <>
      <style>{ESTILOS_IMPRESION_DOCUMENTO}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <span className="text-sm text-brand-n500 flex-1">
          {info.titulo} <strong className="text-slate-800">{cabecera.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>
        <div className="doc-portada" style={{ minHeight: '80vh' }}>
          <PortadaDocumento
            kicker={info.kicker}
            numero={cabecera.numero}
            fecha={new Date(fecha).toLocaleDateString('es-CL')}
            titulo={info.titulo}
            subtitulo={info.subtitulo}
            descripcion="Documento generado a partir del formulario llenado por enlace público."
            campos={[
              { label: 'Proyecto', value: cabecera.proyecto_nombre ?? cabecera.centro_trabajo },
              { label: 'Cliente / Mandante', value: cabecera.cliente_mandante ?? cabecera.mandante },
              { label: 'Ubicación', value: cabecera.ubicacion ?? cabecera.direccion },
              { label: 'Fecha', value: new Date(fecha).toLocaleDateString('es-CL') },
              { label: 'Completado por', value: enlace.completado_por_nombre },
            ]}
          />
        </div>

        {modulo === 'verificacion_ric' && BLOQUES_RIC.filter(b => b.id !== 'CIERRE').map(b => {
          const verif = porBloque(b.id).filter(i => i.tipo === 'verificacion')
          const nota = porBloque(b.id).find(i => i.tipo === 'nota')
          return (
            <div key={b.id} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{b.id}: {b.titulo}</p>
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
              {nota?.notas && (
                <div className="text-xs p-2 rounded" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
                  <strong style={{ color: '#2E333A' }}>Notas: </strong>{nota.notas}
                </div>
              )}
            </div>
          )
        })}

        {modulo === 'checklist_drs' && SECCIONES_DRS.map(seccion => {
          const filas = porSeccion(seccion.id).filter(i => i.tipo === 'medicion')
          if (!filas.length) return null
          return (
            <div key={seccion.id} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{seccion.titulo}</p>
              <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="doc-th">{seccion.columnaEtiqueta}</th>
                    {!seccion.sinValor && <th className="doc-th">{seccion.columnaValor}</th>}
                    {seccion.tieneEstado && <th className="doc-th doc-th-r" style={{ width: 90 }}>Estado</th>}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((item, i) => (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="doc-td">{item.etiqueta}</td>
                      {!seccion.sinValor && <td className="doc-td">{item.valor || '—'}</td>}
                      {seccion.tieneEstado && (
                        <td className="doc-td-r" style={{ fontWeight: 600 }}>
                          {item.estado ? (seccion.labelsEstado?.[['pasa', 'no_pasa', 'na'].indexOf(item.estado)] ?? LABEL_RESULTADO[item.estado]) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {modulo === 'prevencion_riesgos' && CATEGORIAS_CHECKLIST_FAENA.map(categoria => {
          const filas = items.filter(i => i.n !== null && i.categoria === categoria).sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
          if (!filas.length) return null
          return (
            <div key={categoria} className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{categoria}</p>
              <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                <thead><tr><th className="doc-th">Ítem</th><th className="doc-th doc-th-r" style={{ width: 90 }}>Resultado</th></tr></thead>
                <tbody>
                  {filas.map((item, i) => (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="doc-td">
                        {item.item}
                        {item.detalle && <div className="text-[11px]" style={{ color: 'var(--n-500)' }}>{item.detalle}</div>}
                      </td>
                      <td className="doc-td-r" style={{ fontWeight: 600 }}>{item.resultado ? LABEL_RESULTADO[item.resultado] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {modulo === 'pruebas_alimentadores' && alimentadores.map(alimentador => (
          <div key={alimentador.id} className="doc-bloque mb-7">
            <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>{alimentador.nombre || 'Alimentador'}</p>
            <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
              <thead><tr><th className="doc-th">Medición</th><th className="doc-th doc-th-r" style={{ width: 120 }}>Valor</th></tr></thead>
              <tbody>
                {alimentador.items.map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                    <td className="doc-td">{item.texto}</td>
                    <td className="doc-td-r" style={{ fontWeight: 600 }}>{item.valor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Registro fotográfico */}
        {(() => {
          const fotos = modulo === 'verificacion_ric'
            ? items.filter(i => i.tipo === 'foto')
            : modulo === 'checklist_drs'
            ? [...porSeccion(SECCION_IMAGENES.id), ...items.filter(i => i.tipo === 'foto' && i.seccion !== SECCION_IMAGENES.id)]
            : []
          if (!fotos.length) return null
          return (
            <div className="doc-bloque mb-7">
              <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Registro fotográfico</p>
              <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                <thead><tr><th className="doc-th">Foto</th><th className="doc-th" style={{ width: 90 }}>Imagen</th></tr></thead>
                <tbody>
                  {fotos.map((item, i) => (
                    <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="doc-td">{item.texto ?? item.etiqueta}</td>
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
          )
        })()}

        {modulo === 'verificacion_ric' && tableros.length > 0 && (
          <div className="doc-bloque mb-7">
            <p className="doc-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>Anexo Opcional — Checklist SAT por tablero</p>
            {tableros.map(t => (
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

        {/* Cierre + firma(s) */}
        <div className="doc-cierre">
          <p className="font-bold text-sm mb-4" style={{ color: '#2E333A' }}>Cierre</p>
          {modulo === 'prevencion_riesgos' ? (
            <>
              {cabecera.observaciones_generales && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
                  {cabecera.observaciones_generales}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 text-sm mb-4">
                <div>
                  <p><strong style={{ color: '#2E333A' }}>Prevencionista:</strong> {cabecera.firma_prevencionista ?? '—'}</p>
                  {cabecera.firma_prevencionista_imagen_url && urls[cabecera.firma_prevencionista_imagen_url] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[cabecera.firma_prevencionista_imagen_url]} alt="Firma" style={{ height: 60, marginTop: 8 }} />
                  )}
                </div>
                <div>
                  <p><strong style={{ color: '#2E333A' }}>Encargado:</strong> {cabecera.firma_encargado ?? '—'}</p>
                  {cabecera.firma_encargado_imagen_url && urls[cabecera.firma_encargado_imagen_url] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[cabecera.firma_encargado_imagen_url]} alt="Firma" style={{ height: 60, marginTop: 8 }} />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {(cabecera.observaciones || cabecera.observaciones_generales) && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
                  {cabecera.observaciones ?? cabecera.observaciones_generales}
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 text-sm mb-4">
                <p><strong style={{ color: '#2E333A' }}>Nombre:</strong> {cabecera.firma_nombre ?? '—'}</p>
                <p><strong style={{ color: '#2E333A' }}>RUT:</strong> {cabecera.firma_rut ?? '—'}</p>
                <p><strong style={{ color: '#2E333A' }}>Cargo:</strong> {cabecera.firma_cargo ?? '—'}</p>
              </div>
              {cabecera.firma_imagen_url && urls[cabecera.firma_imagen_url] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[cabecera.firma_imagen_url]} alt="Firma" style={{ height: 70, marginBottom: 24 }} />
              )}
            </>
          )}

          <div className="mt-8 pt-4 flex items-center justify-between text-[10px]" style={{ borderTop: '1px solid #E2E4E7', color: '#C0C4CC' }}>
            <span>2C Montajes y Proyectos Eléctricos</span>
            <span>{cabecera.numero}</span>
            <span>{new Date(fecha).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
