'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { num } from '@/lib/utils'
import type { Material, MotivoAjusteInventario } from '@/types'

const MOTIVOS: { value: MotivoAjusteInventario; label: string }[] = [
  { value: 'conteo_fisico', label: 'Conteo físico' },
  { value: 'perdida',       label: 'Pérdida' },
  { value: 'dano',          label: 'Daño' },
  { value: 'error_registro',label: 'Error de registro' },
  { value: 'otro',          label: 'Otro' },
]

export default function NuevaSolicitudAjuste() {
  const [query, setQuery]         = useState('')
  const [suggestions, setSugg]    = useState<Material[]>([])
  const [showDrop, setShowDrop]   = useState(false)
  const [loadingSearch, setLS]    = useState(false)
  const [material, setMaterial]   = useState<Material | null>(null)
  const [cantidad, setCantidad]   = useState('')
  const [motivo, setMotivo]       = useState<MotivoAjusteInventario>('conteo_fisico')
  const [observaciones, setObs]   = useState('')
  const [saving, setSaving]       = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) { setSugg([]); setShowDrop(false); return }
    const t = setTimeout(async () => {
      setLS(true)
      try {
        const res  = await fetch(`/api/materiales?q=${encodeURIComponent(query)}&limit=10`)
        const data = await res.json()
        setSugg(data.data ?? [])
        setShowDrop(true)
      } finally { setLS(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleSave = async () => {
    if (!material) { showToast('Busca y selecciona el material', 'error'); return }
    if (cantidad === '' || Number(cantidad) < 0) { showToast('Indica la cantidad real (puede ser 0)', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/solicitudes-ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: material.id, cantidad_reportada: Number(cantidad), motivo, observaciones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      showToast(`Solicitud ${data.numero} enviada para aprobación`, 'success')
      router.push('/solicitudes-ajuste')
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Solicitud de ajuste de inventario</h1>
          <p className="text-sm text-brand-n500">El stock no cambia hasta que el jefe de bodega apruebe.</p>
        </div>
        <a href="/solicitudes-ajuste" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel-search mb-4">
        <div className="panel-header"><h2>Material</h2></div>
        <div className="p-4">
          {material ? (
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
              <span className="code">{material.codigo}</span>
              <span className="text-sm text-slate-800 flex-1">{material.descripcion}</span>
              <span className="text-xs text-brand-n500">Stock en sistema: {num(material.stock_actual, 0)}</span>
              <button onClick={() => setMaterial(null)} className="text-xs text-brand-n500 hover:text-slate-700 underline">Cambiar</button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-n500 pointer-events-none">
                  {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </span>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                  placeholder="Buscar por código o descripción…" className="input w-full pl-9" />
              </div>
              {showDrop && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                  {suggestions.map(mat => (
                    <button key={mat.id} onMouseDown={e => { e.preventDefault(); setMaterial(mat); setQuery('') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors">
                      <span className="code text-xs flex-shrink-0 w-24 truncate">{mat.codigo}</span>
                      <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{mat.descripcion}</span>
                      <span className="text-xs text-brand-n500 flex-shrink-0">Stock: {num(mat.stock_actual, 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="panel mb-5">
        <div className="panel-header"><h2>Detalle</h2></div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label" htmlFor="ajuste-cantidad">Cantidad real (lo que hay de verdad)</label>
            <input id="ajuste-cantidad" type="number" min="0" step="1" className="input w-full"
              value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="ajuste-motivo">Motivo</label>
            <select id="ajuste-motivo" className="select w-full" value={motivo} onChange={e => setMotivo(e.target.value as MotivoAjusteInventario)}>
              {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ajuste-obs">Observaciones</label>
            <textarea id="ajuste-obs" className="textarea w-full" rows={3} value={observaciones}
              onChange={e => setObs(e.target.value)} placeholder="Detalle de cómo se detectó la diferencia…" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : 'Enviar para aprobación'}
        </button>
        <a href="/solicitudes-ajuste" className="btn btn-outline">Cancelar</a>
      </div>
    </div>
  )
}
