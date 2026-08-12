'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, Plus, Trash2, Check } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import AvanceTimeline from './AvanceTimeline'
import type { AvanceObra as AvanceObraType, AvanceObraItem } from '@/types'

interface EtapaBorrador { etapa: string; descripcion: string; fecha_estimada: string }
const ETAPA_VACIA: EtapaBorrador = { etapa: '', descripcion: '', fecha_estimada: '' }

interface Props {
  proyectoId: number
  initialAvance: (AvanceObraType & { avances_obra_items: AvanceObraItem[] }) | null
  esVisitador: boolean
  editable: boolean
}

export default function AvanceObra({ proyectoId, initialAvance, esVisitador, editable }: Props) {
  const [avance, setAvance] = useState(initialAvance)
  const [borrador, setBorrador] = useState<EtapaBorrador[]>([{ ...ETAPA_VACIA }])
  const [creando, setCreando] = useState(false)
  const [nuevaEtapa, setNuevaEtapa] = useState('')
  const { showToast } = useToast()
  const router = useRouter()

  const puedeEstructurar = editable && esVisitador

  const crearPlan = useCallback(async () => {
    const etapas = borrador.filter(e => e.etapa.trim())
    if (!etapas.length) { showToast('Agrega al menos una etapa', 'error'); return }
    setCreando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/avance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el plan')
      setAvance(data)
      showToast('Plan de avance creado', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setCreando(false)
    }
  }, [borrador, proyectoId, showToast])

  const toggleCompletado = useCallback(async (item: AvanceObraItem) => {
    if (!avance) return
    const completado = !item.completado
    setAvance(prev => prev && ({
      ...prev,
      avances_obra_items: prev.avances_obra_items.map(i => i.id === item.id ? { ...i, completado } : i),
    }))
    const res = await fetch(`/api/avance-obra/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado }),
    })
    if (!res.ok) {
      showToast('Error al actualizar', 'error')
      setAvance(prev => prev && ({
        ...prev,
        avances_obra_items: prev.avances_obra_items.map(i => i.id === item.id ? { ...i, completado: !completado } : i),
      }))
    } else {
      router.refresh()
    }
  }, [avance, router, showToast])

  const agregarEtapa = useCallback(async () => {
    if (!nuevaEtapa.trim()) return
    const res = await fetch(`/api/proyectos/${proyectoId}/avance/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: nuevaEtapa.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Error al agregar etapa', 'error'); return }
    setAvance(prev => prev && ({ ...prev, avances_obra_items: [...prev.avances_obra_items, data] }))
    setNuevaEtapa('')
  }, [nuevaEtapa, proyectoId, showToast])

  const borrarEtapa = useCallback(async (item: AvanceObraItem) => {
    if (!confirm(`¿Eliminar la etapa "${item.etapa}"?`)) return
    const res = await fetch(`/api/avance-obra/items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setAvance(prev => prev && ({ ...prev, avances_obra_items: prev.avances_obra_items.filter(i => i.id !== item.id) }))
  }, [showToast])

  // ── Sin plan todavía ──────────────────────────────────────────────
  if (!avance) {
    if (!puedeEstructurar) {
      return (
        <div className="panel p-6 text-center text-brand-n500 text-sm">
          Esta obra todavía no tiene un plan de avance. Lo crea el Visitador de obra.
        </div>
      )
    }
    return (
      <div className="panel">
        <div className="panel-header"><ListChecks size={14} style={{ color: 'var(--n-500)' }} /><h2>Crear plan de avance</h2></div>
        <div className="p-4 space-y-2">
          {borrador.map((e, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="input flex-1" placeholder={`Etapa ${i + 1} (ej. Armado mecánico)`}
                value={e.etapa} onChange={ev => setBorrador(prev => prev.map((x, j) => j === i ? { ...x, etapa: ev.target.value } : x))} />
              <input className="input w-40" type="date"
                value={e.fecha_estimada} onChange={ev => setBorrador(prev => prev.map((x, j) => j === i ? { ...x, fecha_estimada: ev.target.value } : x))} />
              {borrador.length > 1 && (
                <button className="btn-icon" onClick={() => setBorrador(prev => prev.filter((_, j) => j !== i))} aria-label="Quitar etapa">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => setBorrador(prev => [...prev, { ...ETAPA_VACIA }])}>
            <Plus size={13} /> Agregar etapa
          </button>
          <div className="pt-2">
            <button className="btn btn-primary" onClick={crearPlan} disabled={creando}>
              {creando ? 'Creando…' : 'Crear plan de avance'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Plan existente ───────────────────────────────────────────────
  const items = [...avance.avances_obra_items].sort((a, b) => a.orden - b.orden)

  return (
    <div className="panel">
      <div className="panel-header"><ListChecks size={14} style={{ color: 'var(--n-500)' }} /><h2>Plan de avance</h2></div>
      <div className="p-4 border-b" style={{ borderColor: '#EDEFF2' }}>
        <AvanceTimeline items={items} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th" style={{ width: 36 }}></th>
              <th className="th">Etapa</th>
              <th className="th">Fecha estimada</th>
              <th className="th">Completado por</th>
              {puedeEstructurar && <th className="th">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className={`tr-hover ${item.completado ? 'bg-emerald-50/40' : ''}`}>
                <td className="td text-center">
                  <button
                    onClick={() => editable && toggleCompletado(item)}
                    disabled={!editable}
                    aria-label={item.completado ? `Marcar "${item.etapa}" como pendiente` : `Marcar "${item.etapa}" como completada`}
                    className="w-5 h-5 rounded-md border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: item.completado ? '#059669' : '#D8D8D8',
                      backgroundColor: item.completado ? '#059669' : 'white',
                      cursor: editable ? 'pointer' : 'default',
                    }}
                  >
                    {item.completado && <Check size={13} color="white" strokeWidth={3} />}
                  </button>
                </td>
                <td className="td">
                  <span className={item.completado ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}>{item.etapa}</span>
                  {item.descripcion && <div className="text-xs text-brand-n500">{item.descripcion}</div>}
                </td>
                <td className="td text-xs text-brand-n500">
                  {item.fecha_estimada ? new Date(item.fecha_estimada).toLocaleDateString('es-CL') : '—'}
                </td>
                <td className="td text-xs text-brand-n500">
                  {item.completado_por_nombre ? `${item.completado_por_nombre} · ${item.completado_en ? new Date(item.completado_en).toLocaleDateString('es-CL') : ''}` : '—'}
                </td>
                {puedeEstructurar && (
                  <td className="td">
                    <button className="btn-icon" title="Eliminar etapa" aria-label="Eliminar etapa" onClick={() => borrarEtapa(item)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {puedeEstructurar && (
        <div className="flex gap-2 p-4 border-t" style={{ borderColor: '#EDEFF2' }}>
          <input className="input flex-1" placeholder="Nueva etapa…" value={nuevaEtapa}
            onChange={e => setNuevaEtapa(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarEtapa()} />
          <button className="btn btn-outline btn-sm" onClick={agregarEtapa}><Plus size={13} /> Agregar</button>
        </div>
      )}
    </div>
  )
}
