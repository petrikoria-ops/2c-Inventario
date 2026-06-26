'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, Check, Loader2 } from 'lucide-react'
import { DEPARTAMENTOS_OPERATIVOS, NOMBRE_DEPARTAMENTO } from '@/lib/auth/deptInfo'
import type { Departamento } from '@/lib/auth/permisos'

/**
 * Control "Ver como" — solo lo renderiza el layout/sidebar para master y
 * admin_software. Cambia el departamento simulado vía /api/ver-como (cookie)
 * y refresca para que la barra lateral, el inicio y la visibilidad se adapten.
 *
 * - variant="pills"    → fila de botones (usado en el inicio)
 * - variant="sidebar"  → bloque compacto vertical (usado en la barra lateral)
 */
export default function VerComoSelector({
  verComo,
  variant = 'pills',
  onNavigate,
}: {
  verComo: Departamento | null
  variant?: 'pills' | 'sidebar'
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function cambiar(depto: Departamento | 'real') {
    if (pending) return
    setPending(depto)
    try {
      await fetch('/api/ver-como', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depto: depto === 'real' ? null : depto }),
      })
      onNavigate?.()
      router.refresh()
    } finally {
      // refresh re-renderiza en el servidor; limpiamos el estado local
      setTimeout(() => setPending(null), 400)
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="px-3 pt-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold mb-1.5"
          style={{ color: '#6B7480' }}>
          <Eye size={11} /> Ver como
        </div>
        <select
          value={verComo ?? 'real'}
          disabled={!!pending}
          onChange={e => cambiar(e.target.value as Departamento | 'real')}
          className="w-full text-[12px] rounded-lg px-2.5 py-2 cursor-pointer transition-colors"
          style={{ background: '#262B31', color: '#E5E7EB', border: '1px solid #3A3F47' }}
        >
          <option value="real">— Mi vista (admin)</option>
          {DEPARTAMENTOS_OPERATIVOS.map(d => (
            <option key={d} value={d}>{NOMBRE_DEPARTAMENTO[d]}</option>
          ))}
        </select>
        {verComo && (
          <button
            onClick={() => cambiar('real')}
            disabled={!!pending}
            className="mt-1.5 w-full text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(240,192,0,.14)', color: '#F0C000' }}
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : null}
            Volver a mi vista
          </button>
        )}
      </div>
    )
  }

  // variant pills (inicio)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <Eye size={13} /> Ver como:
      </span>
      <button
        onClick={() => cambiar('real')}
        className={`btn btn-sm ${!verComo ? 'btn-secondary' : 'btn-outline'}`}
      >
        {!verComo && <Check size={12} />} Mi vista
      </button>
      {DEPARTAMENTOS_OPERATIVOS.map(d => (
        <button
          key={d}
          onClick={() => cambiar(d)}
          className={`btn btn-sm ${verComo === d ? 'btn-secondary' : 'btn-outline'}`}
        >
          {pending === d ? <Loader2 size={12} className="animate-spin" /> : verComo === d ? <Check size={12} /> : null}
          {NOMBRE_DEPARTAMENTO[d]}
        </button>
      ))}
    </div>
  )
}
