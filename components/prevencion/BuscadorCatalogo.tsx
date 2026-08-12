'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { CatalogoHallazgo } from '@/types'

interface Props {
  checklistN?: number | null
  onElegir: (hallazgo: CatalogoHallazgo) => void
}

// Buscador sobre el catálogo de 37 hallazgos estándar de la skill —
// reemplaza sin IA el "buscar" de generador/catalogo.js: el
// prevencionista elige de la lista en vez de que un modelo redacte.
export default function BuscadorCatalogo({ checklistN, onElegir }: Props) {
  const [q, setQ] = useState('')
  const [sugeridos, setSugeridos] = useState<CatalogoHallazgo[]>([])
  const [resultados, setResultados] = useState<CatalogoHallazgo[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Al enfocar, sugiere primero las respuestas ya usadas para este mismo
  // ítem del checklist (mismo criterio que la skill: "búscalo primero por
  // checklist_item") — antes de que el usuario escriba nada.
  useEffect(() => {
    if (!checklistN) return
    fetch(`/api/prevencion-riesgos/catalogo?checklist_n=${checklistN}`)
      .then(res => res.ok ? res.json() : [])
      .then(setSugeridos)
  }, [checklistN])

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  useEffect(() => {
    if (q.trim().length < 3) { setResultados([]); return }
    const t = setTimeout(async () => {
      setCargando(true)
      try {
        const res = await fetch(`/api/prevencion-riesgos/catalogo?q=${encodeURIComponent(q.trim())}`)
        setResultados(res.ok ? await res.json() : [])
      } finally {
        setCargando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const lista = q.trim().length >= 3 ? resultados : sugeridos
  const esSugerencia = q.trim().length < 3

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#BBBBBB' }} />
        <input
          className="input text-xs pl-7 pr-7 w-full"
          placeholder="Buscar en el catálogo de hallazgos estándar…"
          value={q}
          onFocus={() => setAbierto(true)}
          onChange={e => { setQ(e.target.value); setAbierto(true) }}
        />
        {q && (
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setQ('')} aria-label="Limpiar">
            <X size={12} style={{ color: '#BBBBBB' }} />
          </button>
        )}
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-white shadow-lg" style={{ borderColor: '#E2E4E7' }}>
          {esSugerencia && lista.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-brand-n500">Ya usado antes para este ítem</div>
          )}
          {cargando && <div className="p-3 text-xs text-brand-n500">Buscando…</div>}
          {!cargando && lista.length === 0 && (
            <div className="p-3 text-xs text-brand-n500">
              {esSugerencia ? 'Escribe al menos 3 letras para buscar, o redáctalo directamente abajo.' : 'Sin coincidencias — puedes redactarlo directamente abajo.'}
            </div>
          )}
          {lista.map(h => (
            <button
              key={h.id}
              type="button"
              className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b last:border-0"
              style={{ borderColor: '#F0F1F3' }}
              onClick={() => { onElegir(h); setAbierto(false); setQ('') }}
            >
              <div className="flex items-center gap-2">
                <span className="code">{h.id}</span>
                <span className="font-medium text-slate-700">{h.diagnostico}</span>
              </div>
              <div className="text-brand-n500 mt-0.5">{h.nivel} · {h.medida_texto}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
