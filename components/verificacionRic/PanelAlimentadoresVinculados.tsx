'use client'
// Informe de Medición N°1 — Alimentadores: en vez de duplicar una tabla de
// aislación/continuidad dentro de Verificación RIC, esta se vincula a
// informes ya existentes del módulo "Pruebas de alimentadores" (o crea uno
// nuevo pre-vinculado).
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Zap, Link2, Unlink, Plus } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import type { PruebaAlimentadores } from '@/types'

interface Props {
  verificacionId: number
  proyectoId: number | null
}

export default function PanelAlimentadoresVinculados({ verificacionId, proyectoId }: Props) {
  const [todas, setTodas] = useState<PruebaAlimentadores[]>([])
  const [cargando, setCargando] = useState(true)
  const { showToast } = useToast()

  const cargar = useCallback(async () => {
    if (!proyectoId) { setCargando(false); return }
    setCargando(true)
    try {
      const res = await fetch(`/api/pruebas-alimentadores?proyecto=${proyectoId}`)
      const data = await res.json()
      setTodas(Array.isArray(data) ? data : [])
    } finally {
      setCargando(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar])

  const vinculadas = todas.filter(p => p.verificacion_ric_id === verificacionId)
  const disponibles = todas.filter(p => !p.verificacion_ric_id)

  const vincular = async (pruebaId: number) => {
    const res = await fetch(`/api/pruebas-alimentadores/${pruebaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificacion_ric_id: verificacionId }),
    })
    if (!res.ok) { showToast('No se pudo vincular el test', 'error'); return }
    cargar()
  }

  const desvincular = async (pruebaId: number) => {
    const res = await fetch(`/api/pruebas-alimentadores/${pruebaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificacion_ric_id: null }),
    })
    if (!res.ok) { showToast('No se pudo desvincular el test', 'error'); return }
    cargar()
  }

  if (cargando) return null

  return (
    <div className="panel">
      <div className="panel-header">
        <Zap size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Informe de Medición N°1 — Alimentadores</h2>
      </div>
      <div className="p-4 space-y-3">
        {vinculadas.length > 0 ? (
          <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
            {vinculadas.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <Link href={`/pruebas-alimentadores/${p.id}`} className="text-sm font-medium flex-1 hover:underline" style={{ color: '#2E333A' }}>
                  {p.numero}
                </Link>
                <span className={`badge ${p.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                  {p.estado === 'completa' ? 'Completo' : 'En progreso'}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => desvincular(p.id)}>
                  <Unlink size={13} /> Desvincular
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-n500">Sin tests de alimentadores vinculados todavía.</p>
        )}

        {!!disponibles.length && (
          <div className="flex items-center gap-2 pt-1">
            <select className="select text-sm flex-1" defaultValue="" onChange={e => e.target.value && vincular(parseInt(e.target.value, 10))}>
              <option value="">— Vincular un test existente de esta obra —</option>
              {disponibles.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}
            </select>
            <Link2 size={14} style={{ color: 'var(--n-500)' }} />
          </div>
        )}

        {proyectoId && (
          <Link href={`/pruebas-alimentadores/nueva?proyecto=${proyectoId}&verificacion_ric_id=${verificacionId}`}
            className="btn btn-outline btn-sm">
            <Plus size={13} /> Crear nuevo test vinculado
          </Link>
        )}
      </div>
    </div>
  )
}
