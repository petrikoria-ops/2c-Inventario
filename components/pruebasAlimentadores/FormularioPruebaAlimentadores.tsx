'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Printer } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import CampoFirma from '@/components/documentos/CampoFirma'
import FotoUploadAlimentador from './FotoUploadAlimentador'
import type { PruebaAlimentadores, PruebaAlimentadoresItem } from '@/types'

interface Props {
  prueba: PruebaAlimentadores
  initialItems: PruebaAlimentadoresItem[]
  editable: boolean
}

export default function FormularioPruebaAlimentadores({ prueba, initialItems, editable }: Props) {
  const [items, setItems] = useState(initialItems)
  const [cabecera, setCabecera] = useState(prueba)
  const [guardando, setGuardando] = useState<number | null>(null)
  const valorTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const { showToast } = useToast()
  const router = useRouter()

  const patchItem = useCallback(async (itemId: number, patch: Partial<PruebaAlimentadoresItem>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    const res = await fetch(`/api/pruebas-alimentadores/${prueba.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [prueba.id, showToast])

  const patchValor = useCallback((itemId: number, valor: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, valor } : i))
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

  const marcarCompleta = async () => {
    await patchCabecera({ estado: 'completa' })
    showToast('Test marcado como completo', 'success')
    router.refresh()
  }

  const totalItems = items.length
  const conValor = items.filter(i => i.valor && i.valor.trim()).length

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
          <p className="text-sm text-brand-n500">{cabecera.proyecto_nombre} · {conValor}/{totalItems} mediciones registradas</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/pruebas-alimentadores/${prueba.id}/imprimir`} className="btn btn-outline btn-sm">
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
          <div><span className="label block">Alimentador / tablero</span>{cabecera.identificacion_alimentador ?? '—'}</div>
          <div><span className="label block">Instrumento</span>{cabecera.instrumento ?? '—'}</div>
        </div>
      </div>

      {/* Mediciones */}
      <div className="panel">
        <div className="panel-header"><h2>Mediciones</h2></div>
        <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
          {items.map(item => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-3">
              <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
              <input
                className="input text-sm md:w-40"
                placeholder="Valor medido (ej. 1.5 MΩ)"
                disabled={!editable}
                value={item.valor ?? ''}
                onChange={e => patchValor(item.id, e.target.value)}
              />
              <FotoUploadAlimentador
                pruebaId={prueba.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                onUploaded={path => patchItem(item.id, { foto_url: path })}
                onRemoved={() => patchItem(item.id, { foto_url: null })}
              />
              {guardando === item.id && <span className="text-[10px] text-brand-n500">guardando…</span>}
            </div>
          ))}
        </div>
      </div>

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
