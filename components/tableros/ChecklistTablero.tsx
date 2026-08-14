'use client'
import { useState, useCallback } from 'react'
import { CHECKLIST_SECTIONS as SECTIONS, CHECKLIST_TOTAL_ITEMS, type CheckKey } from '@/lib/checklist/sections'
import type { TableroChecklist } from '@/types'

interface Props {
  tableroId: number
  initialChecklist: TableroChecklist
  editable?: boolean
}

// Checklist RIC N°2 de armado, persistido — mismos 26 ítems fijos que
// app/checklist/page.tsx (ad-hoc, sin obra asociada), pero cada cambio
// guarda de inmediato contra este tablero. "Guardado por fila" igual que
// Verificación RIC: no hay botón "Guardar" global.
export default function ChecklistTablero({ tableroId, initialChecklist, editable = true }: Props) {
  const [checks, setChecks]     = useState<Record<CheckKey, boolean>>(initialChecklist.checks ?? {})
  const [tecnico, setTecnico]   = useState(initialChecklist.tecnico ?? '')
  const [fecha, setFecha]       = useState(initialChecklist.fecha_inspeccion ?? '')
  const [obs, setObs]           = useState(initialChecklist.observaciones ?? '')
  const [completadoEn, setCompletadoEn] = useState(initialChecklist.completado_en)
  const [saving, setSaving]     = useState(false)

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch(`/api/tableros/${tableroId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } finally {
      setSaving(false)
    }
  }, [tableroId])

  const toggle = useCallback((k: CheckKey) => {
    setChecks(prev => {
      const next = { ...prev, [k]: !prev[k] }
      const done = Object.values(next).filter(Boolean).length
      const nuevoCompletadoEn = done === CHECKLIST_TOTAL_ITEMS ? new Date().toISOString() : null
      setCompletadoEn(nuevoCompletadoEn)
      patch({ checks: next, completado_en: nuevoCompletadoEn })
      return next
    })
  }, [patch])

  const doneItems = Object.values(checks).filter(Boolean).length
  const pct = Math.round((doneItems / CHECKLIST_TOTAL_ITEMS) * 100)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Checklist RIC N°2 de armado</h2>
        <span className="text-xs text-brand-n500 ml-auto">{saving ? 'Guardando…' : completadoEn ? 'Completo' : `${doneItems}/${CHECKLIST_TOTAL_ITEMS}`}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : '#F0C000' }} />
          </div>
          <span className="text-xs text-brand-n500 flex-shrink-0">{pct}%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label" htmlFor="chk-tecnico">Técnico responsable</label>
            <input id="chk-tecnico" className="input w-full" value={tecnico} disabled={!editable}
              onChange={e => setTecnico(e.target.value)}
              onBlur={() => patch({ tecnico: tecnico || null })} />
          </div>
          <div>
            <label className="label" htmlFor="chk-fecha">Fecha de inspección</label>
            <input id="chk-fecha" type="date" className="input w-full" value={fecha ?? ''} disabled={!editable}
              onChange={e => setFecha(e.target.value)}
              onBlur={() => patch({ fecha_inspeccion: fecha || null })} />
          </div>
        </div>
      </div>

      {SECTIONS.map(sec => {
        const secDone = sec.items.filter((_, i) => checks[`${sec.id}_${i}`]).length
        return (
          <div key={sec.id} className="border-t" style={{ borderColor: '#EDEFF2' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#FAFBFC' }}>
              <span className="text-xs font-bold text-slate-700">{sec.title}</span>
              <span className="badge badge-blue text-xs ml-auto">{secDone}/{sec.items.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {sec.items.map((item, i) => {
                const k = `${sec.id}_${i}` as CheckKey
                return (
                  <label key={k} className={`flex items-center gap-3 px-4 py-2.5 transition-colors
                    ${editable ? 'cursor-pointer' : 'cursor-default'} ${checks[k] ? 'bg-green-50/50' : editable ? 'hover:bg-slate-50' : ''}`}>
                    <input type="checkbox" checked={!!checks[k]} disabled={!editable} onChange={() => toggle(k)}
                      className="w-4 h-4 flex-shrink-0 accent-green-600" />
                    <span className={`text-sm ${checks[k] ? 'line-through text-brand-n500' : 'text-slate-700'}`}>
                      {item}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="p-4 border-t" style={{ borderColor: '#EDEFF2' }}>
        <label className="label" htmlFor="chk-obs">Observaciones generales</label>
        <textarea id="chk-obs" className="textarea w-full" rows={3} disabled={!editable}
          placeholder="Notas, pendientes, condiciones especiales…"
          value={obs} onChange={e => setObs(e.target.value)}
          onBlur={() => patch({ observaciones: obs || null })} />
      </div>
    </div>
  )
}
