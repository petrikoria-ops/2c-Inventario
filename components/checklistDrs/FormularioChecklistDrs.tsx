'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Printer, Plus, Trash2, Camera as CameraIcon } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { SECCIONES_DRS, SECCION_IMAGENES } from '@/lib/checklistDrs/plantilla'
import CampoFirma from '@/components/documentos/CampoFirma'
import ResultadoPills from '@/components/verificacionRic/ResultadoPills'
import FotoUploadDrs from './FotoUploadDrs'
import type { ChecklistDrs, ChecklistDrsItem } from '@/types'

interface Props {
  checklist: ChecklistDrs
  initialItems: ChecklistDrsItem[]
  editable: boolean
}

export default function FormularioChecklistDrs({ checklist, initialItems, editable }: Props) {
  const [items, setItems] = useState(initialItems)
  const [cabecera, setCabecera] = useState(checklist)
  const [agregando, setAgregando] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const { showToast } = useToast()
  const router = useRouter()

  const patchItem = useCallback(async (itemId: number, patch: Partial<ChecklistDrsItem>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    const res = await fetch(`/api/checklists-drs/${checklist.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [checklist.id, showToast])

  // Campos de texto (etiqueta/valor/notas) — debounced para no disparar un
  // PATCH por cada tecla, mismo patrón que las Notas de Verificación RIC.
  const patchItemTexto = useCallback((itemId: number, campo: 'etiqueta' | 'valor' | 'notas', valor: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [campo]: valor } : i))
    const key = `${itemId}-${campo}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      fetch(`/api/checklists-drs/${checklist.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valor }),
      })
    }, 600)
  }, [checklist.id])

  const patchCabecera = useCallback(async (patch: Partial<ChecklistDrs>) => {
    setCabecera(prev => ({ ...prev, ...patch }))
    const res = await fetch(`/api/checklists-drs/${checklist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [checklist.id, showToast])

  const agregarFila = async (seccionId: string) => {
    setAgregando(seccionId)
    try {
      const res = await fetch(`/api/checklists-drs/${checklist.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seccion: seccionId, etiqueta: 'Nuevo punto' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo agregar la fila')
      setItems(prev => [...prev, data])
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setAgregando(null)
    }
  }

  const quitarFila = async (itemId: number) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    const res = await fetch(`/api/checklists-drs/${checklist.id}/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      showToast('No se pudo borrar el punto', 'error')
      router.refresh()
    }
  }

  const marcarCompleta = async () => {
    await patchCabecera({ estado: 'completa' })
    showToast('Checklist marcado como completo', 'success')
    router.refresh()
  }

  const porSeccion = (id: string) => items.filter(i => i.seccion === id).sort((a, b) => a.orden - b.orden)
  const itemsImagenes = porSeccion(SECCION_IMAGENES.id)
  const totalFotos = itemsImagenes.length
  const fotosHechas = itemsImagenes.filter(i => i.foto_tomada).length

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
          <h1 className="text-lg font-bold text-slate-800">Checklist DRS — Verificación inicial e informe de imágenes</h1>
          <p className="text-sm text-brand-n500">{cabecera.proyecto_nombre} · {fotosHechas}/{totalFotos} fotos del informe</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/checklist-drs/${checklist.id}/imprimir`} className="btn btn-outline btn-sm">
            <Printer size={13} /> Ver / Imprimir
          </Link>
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
          <div><span className="label block">Cliente/Mandante</span>{cabecera.cliente_mandante ?? '—'}</div>
          <div><span className="label block">Ubicación</span>{cabecera.ubicacion ?? '—'}</div>
          <div><span className="label block">Fecha de visita</span>{new Date(cabecera.fecha_visita).toLocaleDateString('es-CL')}</div>
          <div><span className="label block">Inspector(es)</span>{cabecera.inspectores ?? '—'}</div>
          <div><span className="label block">N° de tableros</span>{cabecera.num_tableros ?? '—'}</div>
        </div>
      </div>

      {/* Secciones de medición */}
      {SECCIONES_DRS.map(seccion => {
        const filas = porSeccion(seccion.id).filter(i => i.tipo === 'medicion')
        const fotos = porSeccion(seccion.id).filter(i => i.tipo === 'foto')
        return (
          <div key={seccion.id} className="panel">
            <div className="panel-header"><h2>{seccion.titulo}</h2></div>

            {filas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">{seccion.columnaEtiqueta}</th>
                      {!seccion.sinValor && <th className="th">{seccion.columnaValor}</th>}
                      {seccion.tieneEstado && <th className="th">Estado</th>}
                      {seccion.permiteAgregar && editable && <th className="th w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(item => (
                      <tr key={item.id} className="tr-hover align-top">
                        <td className="td">
                          {seccion.permiteAgregar && editable ? (
                            <input className="input text-sm" value={item.etiqueta}
                              onChange={e => patchItemTexto(item.id, 'etiqueta', e.target.value)} />
                          ) : (
                            <>
                              <div className="text-sm text-slate-700">{item.etiqueta}</div>
                              {item.referencia && <div className="text-xs text-brand-n500">{item.referencia}</div>}
                            </>
                          )}
                        </td>
                        {!seccion.sinValor && (
                          <td className="td">
                            <input className="input text-sm" disabled={!editable} placeholder={item.referencia ?? ''}
                              value={item.valor ?? ''} onChange={e => patchItemTexto(item.id, 'valor', e.target.value)} />
                          </td>
                        )}
                        {seccion.tieneEstado && (
                          <td className="td">
                            <ResultadoPills value={item.estado} disabled={!editable} labels={seccion.labelsEstado}
                              onChange={r => patchItem(item.id, { estado: r })} />
                          </td>
                        )}
                        {seccion.permiteAgregar && editable && (
                          <td className="td">
                            <button type="button" className="btn btn-ghost btn-sm text-red-600" aria-label="Quitar punto"
                              onClick={() => quitarFila(item.id)}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Registro fotográfico propio de la sección (ej. ubicación en plano de enchufes) */}
            {fotos.length > 0 && (
              <div className="divide-y border-t" style={{ borderColor: '#EDEFF2' }}>
                {fotos.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <input type="checkbox" checked={item.foto_tomada} disabled={!editable}
                      onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })}
                      className="cursor-pointer" aria-label={item.etiqueta} />
                    <span className="flex-1 text-sm text-slate-600">{item.etiqueta}</span>
                    <FotoUploadDrs
                      checklistId={checklist.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                      onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                      onRemoved={() => patchItem(item.id, { foto_url: null })}
                    />
                  </div>
                ))}
              </div>
            )}

            {seccion.permiteAgregar && editable && (
              <div className="p-3 border-t" style={{ borderColor: '#EDEFF2' }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={agregando === seccion.id}
                  onClick={() => agregarFila(seccion.id)}>
                  <Plus size={13} /> {agregando === seccion.id ? 'Agregando…' : 'Agregar punto'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Informe de imágenes */}
      <div className="panel">
        <div className="panel-header">
          <CameraIcon size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
          <h2>{SECCION_IMAGENES.titulo}</h2>
          <span className="text-xs text-brand-n500 ml-auto">{fotosHechas}/{totalFotos}</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
          {itemsImagenes.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <input type="checkbox" checked={item.foto_tomada} disabled={!editable}
                onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })}
                className="cursor-pointer" aria-label={item.etiqueta} />
              <span className="flex-1 text-sm text-slate-600">{item.etiqueta}</span>
              <FotoUploadDrs
                checklistId={checklist.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                onRemoved={() => patchItem(item.id, { foto_url: null })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cierre */}
      <div className="panel">
        <div className="panel-header"><h2>Cierre</h2></div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="drs-firma-nombre">Nombre</label>
              <input id="drs-firma-nombre" className="input" disabled={!editable}
                value={cabecera.firma_nombre ?? ''} onChange={e => patchCabecera({ firma_nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="drs-firma-rut">RUT</label>
              <input id="drs-firma-rut" className="input" disabled={!editable}
                value={cabecera.firma_rut ?? ''} onChange={e => patchCabecera({ firma_rut: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="drs-firma-cargo">Cargo</label>
              <input id="drs-firma-cargo" className="input" disabled={!editable}
                value={cabecera.firma_cargo ?? ''} onChange={e => patchCabecera({ firma_cargo: e.target.value })} />
            </div>
          </div>
          <CampoFirma
            bucket="checklists-drs"
            path={`${checklist.id}/firma.png`}
            firmaUrl={cabecera.firma_imagen_url}
            disabled={!editable}
            onFirmaGuardada={path => patchCabecera({ firma_imagen_url: path })}
          />
        </div>
      </div>
    </div>
  )
}
