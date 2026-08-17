'use client'
import { useState } from 'react'
import { Plus, ShieldAlert } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import AnexoSatTablero from './AnexoSatTablero'
import type { VerificacionRicTablero } from '@/types'

interface Props {
  verificacionId: number
  proyectoId: number | null
  initialTableros: VerificacionRicTablero[]
  editable: boolean
}

export default function PanelAnexoSat({ verificacionId, proyectoId, initialTableros, editable }: Props) {
  const [tableros, setTableros] = useState(initialTableros)
  const [agregando, setAgregando] = useState(false)
  const { showToast } = useToast()

  const patchTablero = async (id: number, patch: Partial<VerificacionRicTablero>) => {
    setTableros(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const res = await fetch(`/api/verificacion-ric/${verificacionId}/tableros/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (!res.ok) { showToast('No se pudo guardar el cambio', 'error'); return }
    // Si el patch tocó tipo_tablero_id, el servidor regeneró los ítems de
    // "puntos específicos" — hay que refrescar esa categoría en el estado.
    const data = await res.json()
    if (data.itemsPuntosEspecificosNuevos !== undefined) {
      setTableros(prev => prev.map(t => t.id !== id ? t : {
        ...t,
        verificaciones_ric_tableros_items: [
          ...(t.verificaciones_ric_tableros_items ?? []).filter(i => i.categoria !== 'puntos_especificos'),
          ...data.itemsPuntosEspecificosNuevos,
        ],
      }))
    }
  }

  const patchItem = (tableroId: number, itemId: number, resultado: 'pasa' | 'no_pasa' | 'na') => {
    setTableros(prev => prev.map(t => t.id !== tableroId ? t : {
      ...t,
      verificaciones_ric_tableros_items: (t.verificaciones_ric_tableros_items ?? []).map(i => i.id === itemId ? { ...i, resultado } : i),
    }))
    fetch(`/api/verificacion-ric/${verificacionId}/tableros/${tableroId}/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultado }),
    }).then(res => { if (!res.ok) showToast('No se pudo guardar el cambio', 'error') })
  }

  const agregarTablero = async () => {
    setAgregando(true)
    try {
      const res = await fetch(`/api/verificacion-ric/${verificacionId}/tableros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `Tablero ${tableros.length + 1}` }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo agregar el tablero')
      setTableros(prev => [...prev, data])
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setAgregando(false)
    }
  }

  const quitarTablero = async (id: number) => {
    if (!confirm('¿Quitar este tablero del Anexo SAT?')) return
    setTableros(prev => prev.filter(t => t.id !== id))
    const res = await fetch(`/api/verificacion-ric/${verificacionId}/tableros/${id}`, { method: 'DELETE' })
    if (!res.ok) showToast('No se pudo quitar el tablero', 'error')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 mt-2">
        <ShieldAlert size={15} style={{ color: 'var(--n-500)' }} />
        <h2 className="text-sm font-bold text-slate-800 flex-1">Anexo Opcional SAT — Checklist por tablero</h2>
        <span className="text-xs text-brand-n500">{tableros.length} tablero{tableros.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--n-500)' }}>
        Checklist punto por punto por tablero (no reemplaza el Informe SAT detallado que se genera aparte cuando corresponde).
        Se hace solo cuando lo exigen las Especificaciones Técnicas o la inspección técnica.
      </p>

      {tableros.map(t => (
        <AnexoSatTablero key={t.id} verificacionId={verificacionId} proyectoId={proyectoId} entry={t} editable={editable}
          onPatch={patch => patchTablero(t.id, patch)} onPatchItem={(itemId, resultado) => patchItem(t.id, itemId, resultado)}
          onDelete={() => quitarTablero(t.id)} />
      ))}

      {editable && (
        <div className="panel">
          <div className="panel-header"><Plus size={14} style={{ color: 'var(--n-500)' }} /><h2>Agregar tablero al Anexo SAT</h2></div>
          <div className="p-4">
            <button type="button" className="btn btn-outline btn-sm" disabled={agregando} onClick={agregarTablero}>
              <Plus size={13} /> {agregando ? 'Agregando…' : 'Agregar tablero'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
