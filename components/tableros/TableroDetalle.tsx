'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { LayoutGrid, ArrowLeft } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { BadgeEstadoTablero } from '@/components/ui/Badge'
import ChecklistTablero from './ChecklistTablero'
import type { Tablero, TableroChecklist, EstadoTablero } from '@/types'

const ESTADOS: { value: EstadoTablero; label: string; requiereFatSat?: boolean }[] = [
  { value: 'por_cubicar', label: 'Por cubicar' },
  { value: 'por_armar',   label: 'Por armar' },
  { value: 'armado',      label: 'Armado' },
  { value: 'en_pruebas',  label: 'En pruebas FAT/SAT', requiereFatSat: true },
  { value: 'terminado',   label: 'Terminado' },
]

interface Props {
  tablero: Tablero
  checklist: TableroChecklist
  editable?: boolean
}

export default function TableroDetalle({ tablero, checklist, editable = true }: Props) {
  const [estado, setEstado] = useState<EstadoTablero>(tablero.estado)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const cambiarEstado = useCallback(async (nuevo: EstadoTablero) => {
    setSaving(true)
    const anterior = estado
    setEstado(nuevo)
    try {
      const res = await fetch(`/api/tableros/${tablero.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      })
      if (!res.ok) throw new Error('Error al cambiar el estado')
      showToast('Estado actualizado', 'success')
    } catch (e: any) {
      setEstado(anterior)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [estado, tablero.id, showToast])

  const opcionesEstado = ESTADOS.filter(e => !e.requiereFatSat || tablero.requiere_fat_sat)

  return (
    <div className="p-5 w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4 text-sm">
        {tablero.proyectos && (
          <Link href={`/proyectos/${tablero.proyectos.id}`} className="flex items-center gap-1 text-brand-n500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} /> {tablero.proyectos.ot} — {tablero.proyectos.nombre}
          </Link>
        )}
      </div>

      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
            <LayoutGrid size={18} style={{ color: '#2E333A' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{tablero.nombre}</h1>
            <p className="text-xs text-brand-n500">
              {tablero.amperaje != null ? `${tablero.amperaje}A` : 'Amperaje no informado'}
              {tablero.requiere_fat_sat && ' · Requiere FAT/SAT'}
            </p>
          </div>
        </div>
        <BadgeEstadoTablero estado={estado} />
      </div>

      {editable && (
        <div className="panel mb-5">
          <div className="panel-header"><h2>Estado</h2></div>
          <div className="p-4">
            <select className="select w-full" value={estado} disabled={saving}
              onChange={e => cambiarEstado(e.target.value as EstadoTablero)}>
              {opcionesEstado.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <ChecklistTablero tableroId={tablero.id} initialChecklist={checklist} editable={editable} />
    </div>
  )
}
