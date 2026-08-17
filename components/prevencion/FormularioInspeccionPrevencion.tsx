'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Plus, X, Printer } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { CATEGORIAS_CHECKLIST_FAENA } from '@/lib/prevencion/checklistFaena'
import { NIVELES_RIESGO, getNivelRiesgo, type NivelRiesgo } from '@/lib/prevencion/clasificacionRiesgo'
import { MEDIDAS_MP } from '@/lib/prevencion/medidasMp'
import CampoFirma from '@/components/documentos/CampoFirma'
import CompartirEnlaceModal from '@/components/enlacesPublicos/CompartirEnlaceModal'
import ResultadoPillsPrevencion from './ResultadoPillsPrevencion'
import BuscadorCatalogo from './BuscadorCatalogo'
import BadgeNivel from './BadgeNivel'
import FotoUploadPrevencion from './FotoUploadPrevencion'
import type { InspeccionPrevencion, InspeccionPrevencionItem, CatalogoHallazgo } from '@/types'

interface Props {
  inspeccion: InspeccionPrevencion
  initialItems: InspeccionPrevencionItem[]
  editable: boolean
}

export default function FormularioInspeccionPrevencion({ inspeccion, initialItems, editable }: Props) {
  const [items, setItems] = useState(initialItems)
  const [cabecera, setCabecera] = useState(inspeccion)
  const [guardando, setGuardando] = useState<number | null>(null)
  const [nuevoHallazgo, setNuevoHallazgo] = useState({ item: '', categoria: '', nivel: 'MEDIO' as NivelRiesgo, detalle: '' })
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const { showToast } = useToast()
  const router = useRouter()

  const patchItem = useCallback(async (itemId: number, patch: Partial<InspeccionPrevencionItem>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    const res = await fetch(`/api/prevencion-riesgos/${inspeccion.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [inspeccion.id, showToast])

  const patchItemDebounced = useCallback((itemId: number, patch: Partial<InspeccionPrevencionItem>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    clearTimeout(timers.current[itemId])
    timers.current[itemId] = setTimeout(() => {
      setGuardando(itemId)
      fetch(`/api/prevencion-riesgos/${inspeccion.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).finally(() => setGuardando(null))
    }, 600)
  }, [inspeccion.id])

  const patchCabecera = useCallback(async (patch: Partial<InspeccionPrevencion>) => {
    setCabecera(prev => ({ ...prev, ...patch }))
    const res = await fetch(`/api/prevencion-riesgos/${inspeccion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [inspeccion.id, showToast])

  const marcarCompleta = async () => {
    await patchCabecera({ estado: 'completa' })
    showToast('Inspección marcada como completa', 'success')
    router.refresh()
  }

  const aplicarCatalogo = (itemId: number, h: CatalogoHallazgo) => {
    patchItem(itemId, {
      detalle: h.diagnostico,
      nivel: h.nivel,
      norma: h.norma,
      medidas_mp: h.medidas_mp,
      medida_texto: h.medida_texto,
      catalogo_id: h.id,
    })
  }

  const toggleMedida = (itemActual: InspeccionPrevencionItem, codigo: string) => {
    const actuales = itemActual.medidas_mp ?? []
    const siguientes = actuales.includes(codigo) ? actuales.filter(c => c !== codigo) : [...actuales, codigo]
    patchItem(itemActual.id, { medidas_mp: siguientes })
  }

  const agregarHallazgo = async () => {
    if (!nuevoHallazgo.item.trim()) { showToast('Describe el hallazgo', 'error'); return }
    const res = await fetch(`/api/prevencion-riesgos/${inspeccion.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoHallazgo),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Error al agregar el hallazgo', 'error'); return }
    setItems(prev => [...prev, data])
    setNuevoHallazgo({ item: '', categoria: '', nivel: 'MEDIO', detalle: '' })
    setMostrarNuevo(false)
    showToast('Hallazgo adicional agregado', 'success')
  }

  const itemsBase = items.filter(i => i.n !== null).sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
  const itemsAdicionales = items.filter(i => i.n === null)
  const hallazgos = items.filter(i => i.resultado === 'no_cumple')
  const conteoNiveles = NIVELES_RIESGO.map(n => ({ ...n, count: hallazgos.filter(h => h.nivel === n.codigo).length }))

  return (
    <div className="p-5 w-full max-w-4xl mx-auto">
      {/* Cabecera de pantalla */}
      <div className="flex items-start justify-between mb-5 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="code">{cabecera.numero}</span>
            <span className={`badge ${cabecera.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
              {cabecera.estado === 'completa' ? 'Completa' : 'En progreso'}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Inspección de faena — Checklist DS 594</h1>
          <p className="text-sm text-brand-n500">{cabecera.centro_trabajo} · {hallazgos.length} hallazgo{hallazgos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/prevencion-riesgos/${inspeccion.id}/imprimir`} className="btn btn-outline btn-sm">
            <Printer size={13} /> Ver / Imprimir
          </Link>
          {editable && <CompartirEnlaceModal modulo="prevencion_riesgos" registroId={inspeccion.id} numero={cabecera.numero} />}
          {editable && cabecera.estado !== 'completa' && (
            <button className="btn btn-primary btn-sm" onClick={marcarCompleta}>
              <CheckCircle2 size={13} /> Marcar como completa
            </button>
          )}
        </div>
      </div>

      {/* Portada */}
      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="label block">Mandante</span>{cabecera.mandante ?? '—'}</div>
          <div><span className="label block">Dirección</span>{cabecera.direccion ?? '—'} {cabecera.comuna ?? ''}</div>
          <div><span className="label block">Fecha</span>{new Date(cabecera.fecha).toLocaleDateString('es-CL')}</div>
          <div><span className="label block">Prevencionista</span>{cabecera.prevencionista ?? '—'}</div>
          <div><span className="label block">N° trabajadores</span>{cabecera.n_trabajadores ?? '—'}</div>
          <div><span className="label block">Lugares inspeccionados</span>{cabecera.lugares_inspeccionados ?? '—'}</div>
        </div>
      </div>

      {/* Resumen de hallazgos por nivel */}
      <div className="panel">
        <div className="panel-header"><h2>Resumen de hallazgos</h2></div>
        <div className="p-4 flex flex-wrap gap-3">
          {conteoNiveles.map(n => (
            <div key={n.codigo} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: '#E2E4E7' }}>
              <BadgeNivel nivel={n.codigo} />
              <span className="text-sm font-semibold text-slate-700">{n.count}</span>
              <span className="text-xs text-brand-n500">· {n.plazo}</span>
            </div>
          ))}
          {!hallazgos.length && <p className="text-sm text-brand-n500">Sin hallazgos por ahora — marca "No cumple" en algún ítem del checklist para registrar uno.</p>}
        </div>
      </div>

      {/* Checklist por categoría */}
      {CATEGORIAS_CHECKLIST_FAENA.map(categoria => {
        const itemsCategoria = itemsBase.filter(i => i.categoria === categoria)
        if (!itemsCategoria.length) return null
        return (
          <div key={categoria} className="panel">
            <div className="panel-header"><h2>{categoria}</h2></div>
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {itemsCategoria.map(item => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-slate-700">{item.item}</span>
                    <ResultadoPillsPrevencion value={item.resultado} disabled={!editable}
                      onChange={r => patchItem(item.id, { resultado: r })} />
                  </div>

                  {item.resultado === 'no_cumple' && (
                    <div className="mt-3 pl-0 md:pl-2 border-l-2 space-y-2.5" style={{ borderColor: '#F0C000' }}>
                      {editable && <BuscadorCatalogo checklistN={item.n} onElegir={h => aplicarCatalogo(item.id, h)} />}

                      <textarea className="textarea text-xs" rows={2} disabled={!editable}
                        placeholder="Detalle / comentario del hallazgo"
                        defaultValue={item.detalle ?? ''}
                        onChange={e => patchItemDebounced(item.id, { detalle: e.target.value })} />

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-brand-n500">Nivel</span>
                        {NIVELES_RIESGO.map(n => (
                          <button key={n.codigo} type="button" disabled={!editable}
                            onClick={() => patchItem(item.id, { nivel: n.codigo, plazo: item.plazo || n.plazo })}
                            className="rounded-md border px-1"
                            style={{ borderColor: item.nivel === n.codigo ? `#${n.color}` : '#E2E4E7', opacity: item.nivel === n.codigo ? 1 : 0.5 }}>
                            <BadgeNivel nivel={n.codigo} />
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {MEDIDAS_MP.map(m => (
                          <button key={m.codigo} type="button" disabled={!editable} title={m.texto}
                            onClick={() => toggleMedida(item, m.codigo)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${(item.medidas_mp ?? []).includes(m.codigo) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200'}`}>
                            {m.codigo}
                          </button>
                        ))}
                      </div>

                      <textarea className="textarea text-xs" rows={2} disabled={!editable}
                        placeholder="Medida correctiva (texto)"
                        defaultValue={item.medida_texto ?? ''}
                        onChange={e => patchItemDebounced(item.id, { medida_texto: e.target.value })} />

                      <div className="grid grid-cols-2 gap-2">
                        <input className="input text-xs" placeholder="Responsable" disabled={!editable}
                          defaultValue={item.responsable ?? ''}
                          onChange={e => patchItemDebounced(item.id, { responsable: e.target.value })} />
                        <input className="input text-xs" placeholder="Plazo" disabled={!editable}
                          defaultValue={item.plazo ?? getNivelRiesgo(item.nivel)?.plazo ?? ''}
                          onChange={e => patchItemDebounced(item.id, { plazo: e.target.value })} />
                      </div>

                      <FotoUploadPrevencion inspeccionId={inspeccion.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                        onUploaded={path => patchItem(item.id, { foto_url: path })}
                        onRemoved={() => patchItem(item.id, { foto_url: null })} />

                      {guardando === item.id && <span className="text-[10px] text-brand-n500">guardando…</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Hallazgos adicionales (fuera del checklist de 33 ítems) */}
      <div className="panel">
        <div className="panel-header">
          <h2>Hallazgos adicionales</h2>
          {editable && (
            <button className="btn btn-outline btn-sm ml-auto" onClick={() => setMostrarNuevo(v => !v)}>
              {mostrarNuevo ? <X size={13} /> : <Plus size={13} />} {mostrarNuevo ? 'Cancelar' : 'Agregar'}
            </button>
          )}
        </div>
        {mostrarNuevo && (
          <div className="p-4 border-b space-y-2" style={{ borderColor: '#EDEFF2' }}>
            <input className="input text-sm" placeholder="Diagnóstico del hallazgo (ej. detectado en foto, sin pregunta de checklist asociada)"
              value={nuevoHallazgo.item} onChange={e => setNuevoHallazgo(p => ({ ...p, item: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input text-sm" placeholder="Categoría (ej. Almacenamiento)"
                value={nuevoHallazgo.categoria} onChange={e => setNuevoHallazgo(p => ({ ...p, categoria: e.target.value }))} />
              <select className="select text-sm" value={nuevoHallazgo.nivel}
                onChange={e => setNuevoHallazgo(p => ({ ...p, nivel: e.target.value as NivelRiesgo }))}>
                {NIVELES_RIESGO.map(n => <option key={n.codigo} value={n.codigo}>{n.nombre}</option>)}
              </select>
            </div>
            <textarea className="textarea text-sm" rows={2} placeholder="Detalle"
              value={nuevoHallazgo.detalle} onChange={e => setNuevoHallazgo(p => ({ ...p, detalle: e.target.value }))} />
            <button className="btn btn-primary btn-sm" onClick={agregarHallazgo}>Guardar hallazgo</button>
          </div>
        )}
        <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
          {itemsAdicionales.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <BadgeNivel nivel={item.nivel} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-700">{item.item}</div>
                {item.detalle && <div className="text-xs text-brand-n500 mt-0.5">{item.detalle}</div>}
              </div>
              <FotoUploadPrevencion inspeccionId={inspeccion.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                onUploaded={path => patchItem(item.id, { foto_url: path })}
                onRemoved={() => patchItem(item.id, { foto_url: null })} />
            </div>
          ))}
          {!itemsAdicionales.length && !mostrarNuevo && (
            <p className="px-4 py-3 text-sm text-brand-n500">Sin hallazgos adicionales.</p>
          )}
        </div>
      </div>

      {/* Cierre */}
      <div className="panel">
        <div className="panel-header"><h2>Cierre</h2></div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label" htmlFor="prev-obs">Observaciones generales</label>
            <textarea id="prev-obs" className="textarea" rows={3} disabled={!editable}
              defaultValue={cabecera.observaciones_generales ?? ''}
              onChange={e => patchCabecera({ observaciones_generales: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="prev-firma-prev">Firma prevencionista</label>
              <input id="prev-firma-prev" className="input" disabled={!editable}
                defaultValue={cabecera.firma_prevencionista ?? ''}
                onChange={e => patchCabecera({ firma_prevencionista: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="prev-firma-enc">Firma encargado</label>
              <input id="prev-firma-enc" className="input" disabled={!editable}
                defaultValue={cabecera.firma_encargado ?? ''}
                onChange={e => patchCabecera({ firma_encargado: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CampoFirma
              bucket="prevencion-riesgos"
              path={`${inspeccion.id}/firma-prevencionista.png`}
              firmaUrl={cabecera.firma_prevencionista_imagen_url}
              label="Firma dibujada — prevencionista"
              disabled={!editable}
              onFirmaGuardada={path => patchCabecera({ firma_prevencionista_imagen_url: path })}
            />
            <CampoFirma
              bucket="prevencion-riesgos"
              path={`${inspeccion.id}/firma-encargado.png`}
              firmaUrl={cabecera.firma_encargado_imagen_url}
              label="Firma dibujada — encargado"
              disabled={!editable}
              onFirmaGuardada={path => patchCabecera({ firma_encargado_imagen_url: path })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
