'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Search, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import type { ProyectoTrabajador, Trabajador } from '@/types'

interface Props {
  proyectoId: number
  initialData: ProyectoTrabajador[]
  editable?: boolean
}

export default function TrabajadoresObra({ proyectoId, initialData, editable = true }: Props) {
  const [asignados, setAsignados] = useState<ProyectoTrabajador[]>(initialData)
  const [query, setQuery]         = useState('')
  const [sugerencias, setSugg]    = useState<Trabajador[]>([])
  const [showDrop, setShowDrop]   = useState(false)
  const [loadingSearch, setLS]    = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (query.length < 2) { setSugg([]); setShowDrop(false); return }
    const t = setTimeout(async () => {
      setLS(true)
      try {
        const res  = await fetch(`/api/trabajadores?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const asignadosIds = new Set(asignados.map(a => a.trabajador_id))
        setSugg((data.data ?? []).filter((t: Trabajador) => !asignadosIds.has(t.id)))
        setShowDrop(true)
      } finally { setLS(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, asignados])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const asignar = useCallback(async (t: Trabajador) => {
    setQuery(''); setSugg([]); setShowDrop(false)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/trabajadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trabajador_id: t.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al asignar')
      setAsignados(prev => [data, ...prev])
      showToast(`${t.nombre} asignado a la obra`, 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }, [proyectoId, showToast])

  const quitar = useCallback(async (pt: ProyectoTrabajador) => {
    if (!confirm(`¿Quitar a ${pt.trabajadores?.nombre} de esta obra?`)) return
    const res = await fetch(`/api/proyectos/${proyectoId}/trabajadores/${pt.trabajador_id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al quitar', 'error'); return }
    setAsignados(prev => prev.filter(a => a.id !== pt.id))
    showToast('Trabajador quitado de la obra', 'success')
  }, [proyectoId, showToast])

  return (
    <div className="panel">
      <div className="panel-header">
        <Users size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
        <h2>Trabajadores en esta obra</h2>
      </div>

      {editable && (
        <div className="p-4 border-b" style={{ borderColor: '#EDEFF2' }} ref={searchRef}>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#BBBBBB' }} />
            <input className="input pl-8" placeholder="Buscar trabajador por nombre o RUT…"
              value={query} onChange={e => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowDrop(true)} />
            {showDrop && (
              <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border max-h-64 overflow-y-auto" style={{ borderColor: '#E8EAED' }}>
                {loadingSearch && <div className="px-3 py-2 text-xs text-brand-n500">Buscando…</div>}
                {!loadingSearch && sugerencias.length === 0 && (
                  <div className="px-3 py-2 text-xs text-brand-n500">Sin resultados</div>
                )}
                {sugerencias.map(t => (
                  <button key={t.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                    onClick={() => asignar(t)}>
                    <span className="font-medium text-slate-800">{t.nombre}</span>
                    {t.cargo && <span className="text-xs text-brand-n500 ml-2">{t.cargo}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Nombre</th>
              <th className="th">Cargo</th>
              <th className="th">Teléfono</th>
              <th className="th">Desde</th>
              {editable && <th className="th">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {asignados.map(a => (
              <tr key={a.id} className="tr-hover">
                <td className="td font-medium">{a.trabajadores?.nombre}</td>
                <td className="td text-xs text-brand-n500">{a.trabajadores?.cargo ?? '—'}</td>
                <td className="td text-xs text-brand-n500">{a.trabajadores?.telefono ?? '—'}</td>
                <td className="td text-xs text-brand-n500">{new Date(a.fecha_asignacion).toLocaleDateString('es-CL')}</td>
                {editable && (
                  <td className="td">
                    <button className="btn-icon" title="Quitar de la obra" aria-label="Quitar de la obra" onClick={() => quitar(a)}>
                      <X size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!asignados.length && (
              <tr><td colSpan={editable ? 5 : 4} className="text-center py-8 text-brand-n500">Sin trabajadores asignados a esta obra</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
