import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/solicitudes/PrintButton'
import { getSignedUrls } from '@/lib/supabase/storage'
import { BLOQUES_RIC, A0_COORDINACION, A0_INFORMES_PROPIOS_TERRENO } from '@/lib/verificacionRic/plantilla'
import type { VerificacionRicItem } from '@/types'

export const dynamic = 'force-dynamic'

const LABEL_RESULTADO: Record<string, string> = { pasa: 'Pasa', no_pasa: 'No pasa', na: 'N/A' }

export default async function ImprimirVerificacionRicPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()
  const { data: verificacion, error } = await sb.from('verificaciones_ric').select('*').eq('id', params.id).single()
  if (error || !verificacion) notFound()

  const { data: items } = await sb
    .from('verificaciones_ric_items')
    .select('*')
    .eq('verificacion_id', params.id)
    .order('bloque').order('orden')

  const todosLosItems: VerificacionRicItem[] = items ?? []
  const paths = todosLosItems.filter(i => i.foto_url).map(i => i.foto_url as string)
  const urls = paths.length ? await getSignedUrls(sb, paths) : {}

  const porBloque = (id: string) => todosLosItems.filter(i => i.bloque === id).sort((a, b) => a.orden - b.orden)

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print-doc { box-shadow: none !important; margin: 0 !important; border: none !important; }
          @page { margin: 1.6cm; size: A4; }

          .ric-portada { break-after: page; page-break-after: always; }
          .ric-cierre  { break-before: page; page-break-before: always; }
          .ric-bloque  { break-inside: avoid; page-break-inside: avoid; }
          .ric-bloque-titulo { break-after: avoid; page-break-after: avoid; }
          table { break-inside: auto; }
          tr    { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
        .doc-th   { background-color: #2E333A; color: #9AA3AE; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .doc-th-r { text-align: right; }
        .doc-td   { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ECEEF1; }
        .doc-td-r { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ECEEF1; text-align: right; }
      `}</style>

      <div className="no-print flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm">
        <a href={`/verificacion-ric/${verificacion.id}`} className="btn btn-ghost btn-sm">← Volver</a>
        <span className="text-sm text-brand-n500 flex-1">
          Verificación RIC <strong className="text-slate-800">{verificacion.numero}</strong>
        </span>
        <PrintButton />
      </div>

      <div className="print-doc bg-white max-w-3xl mx-auto my-8 p-10 shadow-lg rounded-xl" style={{ border: '1px solid #E2E4E7' }}>

        {/* Portada */}
        <div className="ric-portada" style={{ minHeight: '80vh' }}>
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-2c.png" alt="2C Montajes" style={{ height: 48, width: 'auto' }} />
              <div>
                <p className="font-bold text-base" style={{ color: '#181818' }}>2C MONTAJES Y PROYECTOS ELÉCTRICOS</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--n-500)' }}>Verificación Inicial y Puesta en Marcha</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--n-500)' }}>Verificación RIC N°18/19</p>
              <p className="text-3xl font-bold leading-tight" style={{ color: '#F0C000' }}>{verificacion.numero}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--n-500)' }}>{new Date(verificacion.fecha_visita).toLocaleDateString('es-CL')}</p>
            </div>
          </div>

          <div style={{ height: 2, backgroundColor: '#2E333A', marginBottom: 24 }} />

          <div className="grid grid-cols-2 gap-6 mb-7 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--n-500)' }}>Proyecto</p>
              <p className="font-semibold" style={{ color: '#181818' }}>{verificacion.proyecto_nombre ?? '—'}</p>
              {verificacion.cliente_mandante && <p style={{ color: 'var(--n-500)' }}>{verificacion.cliente_mandante}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--n-500)' }}>Ubicación</p>
              <p style={{ color: '#181818' }}>{verificacion.ubicacion ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--n-500)' }}>Inspector(es)</p>
              <p style={{ color: '#181818' }}>{verificacion.inspectores ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--n-500)' }}>N° de tableros</p>
              <p style={{ color: '#181818' }}>{verificacion.num_tableros ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Bloques A.0 - A.11 */}
        {BLOQUES_RIC.filter(b => b.id !== 'CIERRE').map(b => {
          const verif = porBloque(b.id).filter(i => i.tipo === 'verificacion')
          const fotos = porBloque(b.id).filter(i => i.tipo === 'foto')
          const nota  = porBloque(b.id).find(i => i.tipo === 'nota')
          return (
            <div key={b.id} className="ric-bloque mb-7">
              <p className="ric-bloque-titulo font-bold text-sm mb-2" style={{ color: '#2E333A' }}>
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

        {/* Registro fotográfico general + Cierre */}
        <div className="ric-cierre">
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

          <div className="mb-8 p-3 rounded-lg text-sm" style={{ background: verificacion.declaracion_conformidad ? '#ECFDF5' : '#F5F6F7', color: '#4A5260', border: '1px solid #E2E4E7' }}>
            <strong style={{ color: '#2E333A' }}>Declaración de conformidad para energización: </strong>
            {verificacion.declaracion_conformidad ? 'Completada y firmada' : 'Pendiente'}
          </div>

          <div className="grid grid-cols-1 gap-1 text-sm mb-8">
            <p><strong style={{ color: '#2E333A' }}>Nombre:</strong> {verificacion.firma_nombre ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>RUT:</strong> {verificacion.firma_rut ?? '—'}</p>
            <p><strong style={{ color: '#2E333A' }}>Cargo:</strong> {verificacion.firma_cargo ?? '—'}</p>
          </div>

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
