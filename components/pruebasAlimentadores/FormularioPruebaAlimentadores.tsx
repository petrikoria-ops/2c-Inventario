'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Printer, Plus, Trash2, Zap } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import CampoFirma from '@/components/documentos/CampoFirma'
import CompartirEnlaceModal from '@/components/enlacesPublicos/CompartirEnlaceModal'
import VincularObra from '@/components/shared/VincularObra'
import FotoUploadAlimentador from './FotoUploadAlimentador'
import type { PruebaAlimentadores, PruebaAlimentadoresAlimentador, PruebaAlimentadoresItem } from '@/types'

type AlimentadorConItems = PruebaAlimentadoresAlimentador & { pruebas_alimentadores_items: PruebaAlimentadoresItem[] }

interface Props {
  prueba: PruebaAlimentadores
  initialAlimentadores: AlimentadorConItems[]
  editable: boolean
}

export default function FormularioPruebaAlimentadores({ prueba, initialAlimentadores, editable }: Props) {
  const [alimentadores, setAlimentadores] = useState(initialAlimentadores)
  const [cabecera, setCabecera] = useState(prueba)
  const [guardando, setGuardando] = useState<number | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [agregando, setAgregando] = useState(false)
  const valorTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const campoAlimTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const { showToast } = useToast()
  const router = useRouter()

  const patchItem = useCallback(async (alimentadorId: number, itemId: number, patch: Partial<PruebaAlimentadoresItem>) => {
    setAlimentadores(prev => prev.map(a => a.id !== alimentadorId ? a : {
      ...a,
      pruebas_alimentadores_items: a.pruebas_alimentadores_items.map(i => i.id === itemId ? { ...i, ...patch } : i),
    }))
    const res = await fetch(`/api/pruebas-alimentadores/${prueba.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [prueba.id, showToast])

  const patchValor = useCallback((alimentadorId: number, itemId: number, valor: string) => {
    setAlimentadores(prev => prev.map(a => a.id !== alimentadorId ? a : {
      ...a,
      pruebas_alimentadores_items: a.pruebas_alimentadores_items.map(i => i.id === itemId ? { ...i, valor } : i),
    }))
    clearTimeout(valorTimers.current[itemId])
    valorTimers.current[itemId] = setTimeout(() => {
      setGuardando(itemId)
      fetch(`/api/pruebas-alimentadores/${prueba.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor }),
      }).finally(() => setGuardando(null))
    }, 600)
  }, [prueba.id])

  const patchCabecera = useCallback(async (patch: Partial<PruebaAlimentadores>) => {
    setCabecera(prev => ({ ...prev, ...patch }))
    const res = await fetch(`/api/pruebas-alimentadores/${prueba.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [prueba.id, showToast])

  // Nombre / protección aguas arriba / largo del alimentador — debounced
  // igual que las mediciones, para no pegarle a la red en cada tecla.
  const patchAlimentadorCampo = useCallback((alimentadorId: number, campo: 'nombre' | 'proteccion_aguas_arriba' | 'largo', valor: string) => {
    setAlimentadores(prev => prev.map(a => a.id === alimentadorId ? { ...a, [campo]: valor } : a))
    const key = `${alimentadorId}-${campo}`
    clearTimeout(campoAlimTimers.current[key])
    campoAlimTimers.current[key] = setTimeout(() => {
      fetch(`/api/pruebas-alimentadores/${prueba.id}/alimentadores/${alimentadorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valor }),
      }).then(res => { if (!res.ok) showToast('No se pudo guardar el cambio', 'error') })
    }, 600)
  }, [prueba.id, showToast])

  const agregarAlimentador = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) { showToast('Ponle un nombre al alimentador', 'error'); return }
    setAgregando(true)
    try {
      const res = await fetch(`/api/pruebas-alimentadores/${prueba.id}/alimentadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al agregar el alimentador')
      setAlimentadores(prev => [...prev, data])
      setNuevoNombre('')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setAgregando(false)
    }
  }

  const eliminarAlimentador = async (alimentador: AlimentadorConItems) => {
    if (!confirm(`¿Eliminar el alimentador "${alimentador.nombre}" y sus mediciones?`)) return
    const res = await fetch(`/api/pruebas-alimentadores/${prueba.id}/alimentadores/${alimentador.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('No se pudo eliminar el alimentador', 'error'); return }
    setAlimentadores(prev => prev.filter(a => a.id !== alimentador.id))
    router.refresh()
  }

  const marcarCompleta = async () => {
    await patchCabecera({ estado: 'completa' })
    showToast('Test marcado como completo', 'success')
    router.refresh()
  }

  const todosLosItems = alimentadores.flatMap(a => a.pruebas_alimentadores_items)
  const totalItems = todosLosItems.length
  const conValor = todosLosItems.filter(i => i.valor && i.valor.trim()).length

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
          <h1 className="text-lg font-bold text-slate-800">Test de Alimentadores</h1>
          <p className="text-sm text-brand-n500">
            {cabecera.proyecto_nombre} · {alimentadores.length} alimentador{alimentadores.length !== 1 ? 'es' : ''} · {conValor}/{totalItems} mediciones registradas
          </p>
          {cabecera.verificacion_ric_id && (
            <Link href={`/verificacion-ric/${cabecera.verificacion_ric_id}`} className="text-xs hover:underline" style={{ color: '#2563EB' }}>
              Informe de Medición N°1 de esta Verificación RIC →
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/pruebas-alimentadores/${prueba.id}/imprimir`} className="btn btn-outline btn-sm">
            <Printer size={13} /> Ver / Imprimir
          </Link>
          {editable && <CompartirEnlaceModal modulo="pruebas_alimentadores" registroId={prueba.id} numero={cabecera.numero} />}
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
          <div><span className="label block">Instrumento</span>{cabecera.instrumento ?? '—'}</div>
        </div>
        {editable && (
          <div className="px-4 pb-3">
            <VincularObra proyectoId={cabecera.proyecto_id} patchUrl={`/api/pruebas-alimentadores/${prueba.id}`}
              onVinculado={(id, nombre) => setCabecera(prev => ({ ...prev, proyecto_id: id, proyecto_nombre: nombre }))} />
          </div>
        )}
      </div>

      {/* Un panel por alimentador */}
      {alimentadores.map(alimentador => {
        const items = alimentador.pruebas_alimentadores_items
        const conValorAlim = items.filter(i => i.valor && i.valor.trim()).length
        return (
          <div className="panel" key={alimentador.id}>
            <div className="panel-header">
              <Zap size={14} style={{ color: 'var(--n-500)' }} />
              <h2>{alimentador.nombre || 'Alimentador'}</h2>
              <span className="text-xs text-brand-n500 ml-auto mr-2">{conValorAlim}/{items.length}</span>
              {editable && (
                <button className="btn-icon no-print" title="Eliminar alimentador" aria-label={`Eliminar alimentador ${alimentador.nombre}`}
                  onClick={() => eliminarAlimentador(alimentador)}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b" style={{ borderColor: '#EDEFF2' }}>
              <div>
                <label className="label">Nombre del alimentador</label>
                <input className="input" disabled={!editable} placeholder="Ej: Alimentador TG-1 → TS-3"
                  defaultValue={alimentador.nombre}
                  onChange={e => patchAlimentadorCampo(alimentador.id, 'nombre', e.target.value)} />
              </div>
              <div>
                <label className="label">Protección aguas arriba</label>
                <input className="input" disabled={!editable} placeholder="Ej: Interruptor termomagnético 100A"
                  defaultValue={alimentador.proteccion_aguas_arriba ?? ''}
                  onChange={e => patchAlimentadorCampo(alimentador.id, 'proteccion_aguas_arriba', e.target.value)} />
              </div>
              <div>
                <label className="label">Largo</label>
                <input className="input" disabled={!editable} placeholder="Ej: 45 m"
                  defaultValue={alimentador.largo ?? ''}
                  onChange={e => patchAlimentadorCampo(alimentador.id, 'largo', e.target.value)} />
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {items.map(item => (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-3">
                  <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
                  <input
                    className="input text-sm md:w-40"
                    placeholder="Valor medido (ej. 1.5 MΩ)"
                    disabled={!editable}
                    value={item.valor ?? ''}
                    onChange={e => patchValor(alimentador.id, item.id, e.target.value)}
                  />
                  <FotoUploadAlimentador
                    pruebaId={prueba.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                    onUploaded={path => patchItem(alimentador.id, item.id, { foto_url: path })}
                    onRemoved={() => patchItem(alimentador.id, item.id, { foto_url: null })}
                  />
                  {guardando === item.id && <span className="text-[10px] text-brand-n500">guardando…</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Agregar otro alimentador */}
      {editable && (
        <div className="panel no-print">
          <div className="panel-header"><Plus size={14} style={{ color: 'var(--n-500)' }} /><h2>Agregar otro alimentador</h2></div>
          <div className="p-4 flex gap-2">
            <input className="input flex-1" placeholder="Nombre del alimentador…" value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarAlimentador()} />
            <button className="btn btn-outline btn-sm" onClick={agregarAlimentador} disabled={agregando}>
              <Plus size={13} /> {agregando ? 'Agregando…' : 'Agregar alimentador'}
            </button>
          </div>
        </div>
      )}

      {/* Cierre */}
      <div className="panel">
        <div className="panel-header"><h2>Cierre</h2></div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label" htmlFor="alim-obs">Observaciones</label>
            <textarea id="alim-obs" className="textarea" rows={3} disabled={!editable}
              defaultValue={cabecera.observaciones ?? ''}
              onChange={e => patchCabecera({ observaciones: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="alim-firma-nombre">Nombre</label>
              <input id="alim-firma-nombre" className="input" disabled={!editable}
                value={cabecera.firma_nombre ?? ''} onChange={e => patchCabecera({ firma_nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="alim-firma-rut">RUT</label>
              <input id="alim-firma-rut" className="input" disabled={!editable}
                value={cabecera.firma_rut ?? ''} onChange={e => patchCabecera({ firma_rut: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="alim-firma-cargo">Cargo</label>
              <input id="alim-firma-cargo" className="input" disabled={!editable}
                value={cabecera.firma_cargo ?? ''} onChange={e => patchCabecera({ firma_cargo: e.target.value })} />
            </div>
          </div>
          <CampoFirma
            bucket="pruebas-alimentadores"
            path={`${prueba.id}/firma.png`}
            firmaUrl={cabecera.firma_imagen_url}
            disabled={!editable}
            onFirmaGuardada={path => patchCabecera({ firma_imagen_url: path })}
          />
        </div>
      </div>
    </div>
  )
}
