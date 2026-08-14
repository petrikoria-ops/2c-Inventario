'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { LayoutGrid, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { BadgeEstadoTablero } from '@/components/ui/Badge'
import type { Tablero } from '@/types'

interface Props {
  proyectoId: number
  initialData: Tablero[]
  editable?: boolean
}

export default function TablerosObra({ proyectoId, initialData, editable = true }: Props) {
  const [tableros, setTableros] = useState<Tablero[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre]     = useState('')
  const [amperaje, setAmperaje] = useState('')
  const [fatSat, setFatSat]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const { showToast } = useToast()

  const crear = useCallback(async () => {
    if (!nombre.trim()) { showToast('El nombre del tablero es obligatorio', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tableros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: proyectoId,
          nombre: nombre.trim(),
          amperaje: amperaje || null,
          requiere_fat_sat: fatSat,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el tablero')
      setTableros(prev => [data, ...prev])
      setNombre(''); setAmperaje(''); setFatSat(false); setShowForm(false)
      showToast(`Tablero "${data.nombre}" creado`, 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [proyectoId, nombre, amperaje, fatSat, showToast])

  return (
    <div className="panel">
      <div className="panel-header">
        <LayoutGrid size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
        <h2>Tableros de esta obra</h2>
        {editable && (
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm ml-auto">
            <Plus size={13} /> Nuevo tablero
          </button>
        )}
      </div>

      {editable && showForm && (
        <div className="p-4 border-b grid grid-cols-1 sm:grid-cols-[1fr,140px,auto] gap-3 items-end" style={{ borderColor: '#EDEFF2' }}>
          <div>
            <label className="label" htmlFor="tablero-nombre">Nombre</label>
            <input id="tablero-nombre" className="input w-full" placeholder="Tablero TG-01 Galpón Norte"
              value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tablero-amperaje">Amperaje</label>
            <input id="tablero-amperaje" type="number" min="0" className="input w-full" placeholder="A"
              value={amperaje} onChange={e => setAmperaje(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            <label className="flex items-center gap-1.5 text-xs text-brand-n500 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={fatSat} onChange={e => setFatSat(e.target.checked)} className="w-4 h-4" />
              Requiere FAT/SAT
            </label>
            <button onClick={crear} disabled={saving} className="btn btn-outline btn-sm">
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {tableros.length === 0 ? (
        <div className="p-6 text-center text-sm text-brand-n500">Esta obra todavía no tiene tableros registrados.</div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
          {tableros.map(t => (
            <Link key={t.id} href={`/tableros/${t.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-800 text-sm">{t.nombre}</span>
              {t.amperaje != null && <span className="text-xs text-brand-n500">{t.amperaje}A</span>}
              {t.requiere_fat_sat && <span className="badge badge-blue">FAT/SAT</span>}
              <BadgeEstadoTablero estado={t.estado} />
              <ArrowRight size={14} className="text-slate-300 ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
