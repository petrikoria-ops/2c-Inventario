'use client'
// Formulario público (sin login) para llenar una verificación compartida
// por /completar/[token]. Es una versión simplificada de los 4
// Formulario* internos: no permite agregar/quitar filas, ni tocar campos de
// triage interno (nivel de riesgo, medidas MP, responsable/plazo, catálogo
// de hallazgos en Prevención) — eso lo completa el personal después, desde
// la app. Cabecera/ítems van tipados como Record<string, any> a propósito:
// las 4 formas (RIC, DRS, Prevención, Alimentadores) difieren lo suficiente
// como para que forzar un tipo único no aporte, y esto ya es una capa
// simplificada sobre los tipos reales (ver types/index.ts para el detalle).
import { useState } from 'react'
import { CheckCircle2, Printer, Plus } from 'lucide-react'
import { BLOQUES_RIC } from '@/lib/verificacionRic/plantilla'
import { SECCIONES_DRS, SECCION_IMAGENES } from '@/lib/checklistDrs/plantilla'
import { CATEGORIAS_CHECKLIST_FAENA } from '@/lib/prevencion/checklistFaena'
import PillsPublico from './PillsPublico'
import FotoCampoPublico from './FotoCampoPublico'
import FirmaCampoPublico from './FirmaCampoPublico'
import AnexoSatTableroPublico from './AnexoSatTableroPublico'
import type { ModuloPublico } from '@/types'

type Registro = Record<string, any>

interface Props {
  token: string
  modulo: ModuloPublico
  cabeceraInicial: Registro
  itemsIniciales: Registro[]
  alimentadoresIniciales: (Registro & { items: Registro[] })[]
  tablerosIniciales: Registro[]
  fotosFirmadas: Record<string, string>
  yaCompletado: boolean
  completadoPorNombre: string | null
  completadoPorRut: string | null
}

const TITULOS: Record<ModuloPublico, string> = {
  verificacion_ric: 'Verificación RIC N°18/19',
  checklist_drs: 'Checklist DRS',
  prevencion_riesgos: 'Inspección de prevención de riesgos',
  pruebas_alimentadores: 'Test de Alimentadores',
}

export default function FormularioPublico(props: Props) {
  const { token, modulo, fotosFirmadas } = props
  const [cabecera, setCabecera] = useState<Registro>(props.cabeceraInicial)
  const [items, setItems] = useState<Registro[]>(props.itemsIniciales)
  const [alimentadores, setAlimentadores] = useState(props.alimentadoresIniciales)
  const [tableros, setTableros] = useState<Registro[]>(props.tablerosIniciales)
  const [agregandoTablero, setAgregandoTablero] = useState(false)
  const [enviado, setEnviado] = useState(props.yaCompletado)
  const [nombre, setNombre] = useState(props.completadoPorNombre ?? cabecera.firma_nombre ?? '')
  const [rut, setRut] = useState(props.completadoPorRut ?? cabecera.firma_rut ?? '')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const patchItem = (itemId: number, patch: Registro) => {
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, ...patch } : i)))
    fetch(`/api/publico/${token}/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
  }

  const patchAlimentadorItem = (alimentadorId: number, itemId: number, patch: Registro) => {
    setAlimentadores(prev => prev.map(a => (a.id !== alimentadorId ? a : {
      ...a, items: a.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)),
    })))
    fetch(`/api/publico/${token}/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
  }

  const patchCabecera = (patch: Registro) => {
    setCabecera(prev => ({ ...prev, ...patch }))
    fetch(`/api/publico/${token}/cabecera`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
  }

  const patchTablero = (tableroId: number, patch: Registro) => {
    setTableros(prev => prev.map(t => (t.id === tableroId ? { ...t, ...patch } : t)))
    fetch(`/api/publico/${token}/tableros/${tableroId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
  }

  const agregarTablero = async () => {
    setAgregandoTablero(true)
    try {
      const res = await fetch(`/api/publico/${token}/tableros`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `Tablero ${tableros.length + 1}` }),
      })
      const data = await res.json()
      if (res.ok) setTableros(prev => [...prev, data])
    } finally {
      setAgregandoTablero(false)
    }
  }

  const quitarTablero = async (tableroId: number) => {
    if (!confirm('¿Quitar este tablero del Anexo SAT?')) return
    setTableros(prev => prev.filter(t => t.id !== tableroId))
    fetch(`/api/publico/${token}/tableros/${tableroId}`, { method: 'DELETE' })
  }

  const enviar = async () => {
    if (!nombre.trim()) { setError('Ingresa tu nombre para enviar.'); return }
    setEnviando(true)
    setError('')
    try {
      const res = await fetch(`/api/publico/${token}/finalizar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, rut }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar.')
      setEnviado(true)
      setCabecera(prev => ({ ...prev, estado: 'completa' }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const porBloque = (id: string) => items.filter(i => i.bloque === id).sort((a, b) => a.orden - b.orden)
  const porSeccion = (id: string) => items.filter(i => i.seccion === id).sort((a, b) => a.orden - b.orden)

  return (
    <div className="p-5 w-full max-w-3xl mx-auto pb-16" style={{ background: '#F5F6F7', minHeight: '100vh' }}>
      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-800">{TITULOS[modulo]}</h1>
        <p className="text-sm text-brand-n500">
          {cabecera.numero} · {cabecera.proyecto_nombre ?? cabecera.centro_trabajo ?? ''}
        </p>
      </div>

      {enviado && (
        <div className="alert alert-green mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Enviado — gracias. Si necesitas corregir algo, hazlo y vuelve a enviar.</span>
          <a href={`/completar/${token}/resultado`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            <Printer size={13} /> Descargar / Imprimir
          </a>
        </div>
      )}

      {error && <div className="alert alert-red mb-5 text-sm">{error}</div>}

      {/* Portada genérica */}
      <div className="panel">
        <div className="panel-header"><h2>Datos de la visita</h2></div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="label block">Cliente/Mandante</span>{cabecera.cliente_mandante ?? cabecera.mandante ?? '—'}</div>
          <div><span className="label block">Ubicación</span>{cabecera.ubicacion ?? cabecera.direccion ?? '—'}</div>
          <div><span className="label block">Fecha</span>{new Date(cabecera.fecha_visita ?? cabecera.fecha).toLocaleDateString('es-CL')}</div>
        </div>
      </div>

      {modulo === 'verificacion_ric' && items.length === 0 && !cabecera.incluye_anexo_sat && (
        <div className="panel">
          <div className="p-4 text-sm text-brand-n500">
            Esta verificación no incluye el checklist de Sección A — solo hace falta la firma más abajo.
          </div>
        </div>
      )}

      {modulo === 'verificacion_ric' && items.length > 0 && (
        <>
          {BLOQUES_RIC.filter(b => b.id !== 'CIERRE').map(b => (
            <div key={b.id} className="panel">
              <div className="panel-header"><h2>{b.id}: {b.titulo}</h2></div>
              {porBloque(b.id).filter(i => i.tipo === 'verificacion').map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                  <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
                  <PillsPublico value={item.resultado} opciones={['pasa', 'no_pasa', 'na']}
                    onChange={r => patchItem(item.id, { resultado: r })} />
                </div>
              ))}
              {porBloque(b.id).filter(i => i.tipo === 'foto').map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                  <input type="checkbox" checked={item.foto_tomada}
                    onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })} />
                  <span className="flex-1 text-sm text-slate-600">{item.texto}</span>
                  <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                    onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                    onRemoved={() => patchItem(item.id, { foto_url: null })} />
                </div>
              ))}
              {porBloque(b.id).filter(i => i.tipo === 'nota').map(item => (
                <div key={item.id} className="p-4 border-t" style={{ borderColor: '#EDEFF2' }}>
                  <label className="label">Notas / Observaciones</label>
                  <textarea className="textarea" defaultValue={item.notas ?? ''}
                    onChange={e => patchItem(item.id, { notas: e.target.value })}
                    placeholder="Hallazgos, decisiones o pendientes de este bloque" />
                </div>
              ))}
            </div>
          ))}

          <div className="panel">
            <div className="panel-header"><h2>Registro fotográfico general de la visita</h2></div>
            {porBloque('CIERRE').map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                <input type="checkbox" checked={item.foto_tomada}
                  onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })} />
                <span className="flex-1 text-sm text-slate-600">{item.texto}</span>
                <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                  onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                  onRemoved={() => patchItem(item.id, { foto_url: null })} />
              </div>
            ))}
          </div>
        </>
      )}

      {modulo === 'verificacion_ric' && cabecera.incluye_anexo_sat && (
        <div>
          <div className="flex items-center gap-2 mb-2 mt-2">
            <h2 className="text-sm font-bold text-slate-800 flex-1">Anexo Opcional SAT — Checklist por tablero</h2>
            <span className="text-xs text-brand-n500">{tableros.length} tablero{tableros.length !== 1 ? 's' : ''}</span>
          </div>
          {tableros.map(t => (
            <AnexoSatTableroPublico key={t.id} token={token} entry={t}
              previewUrlInicial={t.foto_url ? fotosFirmadas[t.foto_url] : undefined}
              onPatch={patch => patchTablero(t.id, patch)} onDelete={() => quitarTablero(t.id)} />
          ))}
          <div className="panel">
            <div className="p-4">
              <button type="button" className="btn btn-outline btn-sm" disabled={agregandoTablero} onClick={agregarTablero}>
                <Plus size={13} /> {agregandoTablero ? 'Agregando…' : 'Agregar tablero'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modulo === 'verificacion_ric' && (
        <div className="panel">
          <div className="panel-header"><h2>Cierre</h2></div>
          <div className="p-4 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!cabecera.declaracion_conformidad}
                onChange={e => patchCabecera({ declaracion_conformidad: e.target.checked })} />
              Declaración de conformidad para energización completada y firmada
            </label>
            <CamposFirmaTexto cabecera={cabecera} patchCabecera={patchCabecera} />
            <FirmaCampoPublico token={token} campo="firma_imagen_url"
              previewUrlInicial={cabecera.firma_imagen_url ? fotosFirmadas[cabecera.firma_imagen_url] ?? null : null}
              onFirmaGuardada={path => patchCabecera({ firma_imagen_url: path })} />
          </div>
        </div>
      )}

      {modulo === 'checklist_drs' && (
        <>
          {SECCIONES_DRS.map(seccion => {
            const filas = porSeccion(seccion.id).filter(i => i.tipo === 'medicion')
            const fotos = porSeccion(seccion.id).filter(i => i.tipo === 'foto')
            if (!filas.length && !fotos.length) return null
            return (
              <div key={seccion.id} className="panel">
                <div className="panel-header"><h2>{seccion.titulo}</h2></div>
                {filas.map(item => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700">{item.etiqueta}</div>
                      {item.referencia && <div className="text-xs text-brand-n500">{item.referencia}</div>}
                    </div>
                    {!seccion.sinValor && (
                      <input className="input text-sm md:w-40" placeholder={seccion.columnaValor}
                        value={item.valor ?? ''} onChange={e => patchItem(item.id, { valor: e.target.value })} />
                    )}
                    {seccion.tieneEstado && (
                      <PillsPublico value={item.estado} opciones={['pasa', 'no_pasa', 'na']} labels={seccion.labelsEstado}
                        onChange={r => patchItem(item.id, { estado: r })} />
                    )}
                  </div>
                ))}
                {fotos.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                    <input type="checkbox" checked={item.foto_tomada}
                      onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })} />
                    <span className="flex-1 text-sm text-slate-600">{item.etiqueta}</span>
                    <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                      onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                      onRemoved={() => patchItem(item.id, { foto_url: null })} />
                  </div>
                ))}
              </div>
            )
          })}

          <div className="panel">
            <div className="panel-header"><h2>{SECCION_IMAGENES.titulo}</h2></div>
            {porSeccion(SECCION_IMAGENES.id).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: '#EDEFF2' }}>
                <input type="checkbox" checked={item.foto_tomada}
                  onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })} />
                <span className="flex-1 text-sm text-slate-600">{item.etiqueta}</span>
                <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                  onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                  onRemoved={() => patchItem(item.id, { foto_url: null })} />
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Cierre</h2></div>
            <div className="p-4 space-y-4">
              <CamposFirmaTexto cabecera={cabecera} patchCabecera={patchCabecera} />
              <FirmaCampoPublico token={token} campo="firma_imagen_url"
                previewUrlInicial={cabecera.firma_imagen_url ? fotosFirmadas[cabecera.firma_imagen_url] ?? null : null}
                onFirmaGuardada={path => patchCabecera({ firma_imagen_url: path })} />
            </div>
          </div>
        </>
      )}

      {modulo === 'prevencion_riesgos' && (
        <>
          {CATEGORIAS_CHECKLIST_FAENA.map(categoria => {
            const itemsCategoria = items.filter(i => i.n !== null && i.categoria === categoria).sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
            if (!itemsCategoria.length) return null
            return (
              <div key={categoria} className="panel">
                <div className="panel-header"><h2>{categoria}</h2></div>
                {itemsCategoria.map(item => (
                  <div key={item.id} className="px-4 py-3 border-t" style={{ borderColor: '#EDEFF2' }}>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-slate-700">{item.item}</span>
                      <PillsPublico value={item.resultado} opciones={['cumple', 'no_cumple', 'na']} labels={['Cumple', 'No cumple', 'N/A']}
                        onChange={r => patchItem(item.id, { resultado: r })} />
                    </div>
                    {item.resultado === 'no_cumple' && (
                      <div className="mt-3 pl-2 border-l-2 space-y-2.5" style={{ borderColor: '#F0C000' }}>
                        <textarea className="textarea text-xs" rows={2} placeholder="Detalle / comentario del hallazgo"
                          defaultValue={item.detalle ?? ''} onChange={e => patchItem(item.id, { detalle: e.target.value })} />
                        <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                          onUploaded={path => patchItem(item.id, { foto_url: path })}
                          onRemoved={() => patchItem(item.id, { foto_url: null })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}

          <div className="panel">
            <div className="panel-header"><h2>Cierre</h2></div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Observaciones generales</label>
                <textarea className="textarea" rows={3} defaultValue={cabecera.observaciones_generales ?? ''}
                  onChange={e => patchCabecera({ observaciones_generales: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Firma prevencionista</label>
                  <input className="input" defaultValue={cabecera.firma_prevencionista ?? ''}
                    onChange={e => patchCabecera({ firma_prevencionista: e.target.value })} />
                </div>
                <div>
                  <label className="label">Firma encargado</label>
                  <input className="input" defaultValue={cabecera.firma_encargado ?? ''}
                    onChange={e => patchCabecera({ firma_encargado: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FirmaCampoPublico token={token} campo="firma_prevencionista_imagen_url" label="Firma dibujada — prevencionista"
                  previewUrlInicial={cabecera.firma_prevencionista_imagen_url ? fotosFirmadas[cabecera.firma_prevencionista_imagen_url] ?? null : null}
                  onFirmaGuardada={path => patchCabecera({ firma_prevencionista_imagen_url: path })} />
                <FirmaCampoPublico token={token} campo="firma_encargado_imagen_url" label="Firma dibujada — encargado"
                  previewUrlInicial={cabecera.firma_encargado_imagen_url ? fotosFirmadas[cabecera.firma_encargado_imagen_url] ?? null : null}
                  onFirmaGuardada={path => patchCabecera({ firma_encargado_imagen_url: path })} />
              </div>
            </div>
          </div>
        </>
      )}

      {modulo === 'pruebas_alimentadores' && (
        <>
          {alimentadores.map(alimentador => (
            <div key={alimentador.id} className="panel">
              <div className="panel-header">
                <h2>{alimentador.nombre || 'Alimentador'}</h2>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-brand-n500 border-b" style={{ borderColor: '#EDEFF2' }}>
                {alimentador.proteccion_aguas_arriba && <div>Protección aguas arriba: {alimentador.proteccion_aguas_arriba}</div>}
                {alimentador.largo && <div>Largo: {alimentador.largo}</div>}
              </div>
              {alimentador.items.map((item: Registro) => (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-3 border-t" style={{ borderColor: '#EDEFF2' }}>
                  <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
                  <input className="input text-sm md:w-40" placeholder="Valor medido"
                    value={item.valor ?? ''} onChange={e => patchAlimentadorItem(alimentador.id, item.id, { valor: e.target.value })} />
                  <FotoCampoPublico token={token} itemId={item.id} previewUrlInicial={item.foto_url ? fotosFirmadas[item.foto_url] : undefined}
                    onUploaded={path => patchAlimentadorItem(alimentador.id, item.id, { foto_url: path })}
                    onRemoved={() => patchAlimentadorItem(alimentador.id, item.id, { foto_url: null })} />
                </div>
              ))}
            </div>
          ))}

          <div className="panel">
            <div className="panel-header"><h2>Cierre</h2></div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Observaciones</label>
                <textarea className="textarea" rows={3} defaultValue={cabecera.observaciones ?? ''}
                  onChange={e => patchCabecera({ observaciones: e.target.value })} />
              </div>
              <CamposFirmaTexto cabecera={cabecera} patchCabecera={patchCabecera} />
              <FirmaCampoPublico token={token} campo="firma_imagen_url"
                previewUrlInicial={cabecera.firma_imagen_url ? fotosFirmadas[cabecera.firma_imagen_url] ?? null : null}
                onFirmaGuardada={path => patchCabecera({ firma_imagen_url: path })} />
            </div>
          </div>
        </>
      )}

      <div className="panel">
        <div className="panel-header"><h2>Enviar</h2></div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="enviar-nombre">Tu nombre</label>
              <input id="enviar-nombre" className="input" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="enviar-rut">RUT (opcional)</label>
              <input id="enviar-rut" className="input" value={rut} onChange={e => setRut(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary w-full justify-center" onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando…' : enviado ? 'Reenviar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Nombre/RUT/Cargo del firmante — mismo shape en RIC, DRS y Alimentadores.
function CamposFirmaTexto({ cabecera, patchCabecera }: { cabecera: Registro; patchCabecera: (p: Registro) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="label">Nombre</label>
        <input className="input" defaultValue={cabecera.firma_nombre ?? ''} onChange={e => patchCabecera({ firma_nombre: e.target.value })} />
      </div>
      <div>
        <label className="label">RUT</label>
        <input className="input" defaultValue={cabecera.firma_rut ?? ''} onChange={e => patchCabecera({ firma_rut: e.target.value })} />
      </div>
      <div>
        <label className="label">Cargo</label>
        <input className="input" defaultValue={cabecera.firma_cargo ?? ''} onChange={e => patchCabecera({ firma_cargo: e.target.value })} />
      </div>
    </div>
  )
}
