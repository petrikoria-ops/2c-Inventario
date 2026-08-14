'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, Check, Loader2 } from 'lucide-react'
import { DEPARTAMENTOS_OPERATIVOS, NOMBRE_DEPARTAMENTO } from '@/lib/auth/deptInfo'
import { PUESTOS_POR_DEPARTAMENTO, type Departamento } from '@/lib/auth/permisos'

/**
 * Control "Ver como" — solo lo renderiza el layout/sidebar para master y
 * admin_software. Cambia el departamento (y opcionalmente el puesto
 * específico dentro de él) simulado vía /api/ver-como (cookies) y refresca
 * para que la barra lateral, el inicio y la visibilidad se adapten.
 *
 * Sin elegir puesto, se simula el de mayor jerarquía del área (el jefe) —
 * igual que el comportamiento original. Elegir un puesto puntual (ej.
 * "Bodeguero" en vez de "Encargado de bodega") es lo que permite comparar
 * cómo ve la app un operario contra cómo la ve su jefe, no solo departamento
 * contra departamento.
 *
 * - variant="pills"    → fila de botones + selector de puesto (usado en el inicio)
 * - variant="sidebar"  → bloque compacto vertical (usado en la barra lateral)
 */
export default function VerComoSelector({
  verComo,
  verComoPuesto = null,
  variant = 'pills',
  onNavigate,
}: {
  verComo: Departamento | null
  verComoPuesto?: string | null
  variant?: 'pills' | 'sidebar'
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function cambiar(depto: Departamento | 'real', puesto: string | null = null) {
    if (pending) return
    setPending(depto)
    try {
      await fetch('/api/ver-como', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depto: depto === 'real' ? null : depto, puesto }),
      })
      onNavigate?.()
      router.refresh()
    } finally {
      // refresh re-renderiza en el servidor; limpiamos el estado local
      setTimeout(() => setPending(null), 400)
    }
  }

  const puestoDefaultLabel = (d: Departamento) => {
    const jefe = PUESTOS_POR_DEPARTAMENTO[d].find(p => p.nivel === 'administrador')
    return jefe ? `— ${jefe.puesto} (jefatura, por defecto) —` : '— Jefatura del área (por defecto) —'
  }

  const SelectorPuesto = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    !verComo ? null : (
      <select
        value={verComoPuesto ?? ''}
        disabled={!!pending}
        onChange={e => cambiar(verComo, e.target.value || null)}
        className={className}
        style={style}
      >
        <option value="">{puestoDefaultLabel(verComo)}</option>
        {PUESTOS_POR_DEPARTAMENTO[verComo].map(p => (
          <option key={p.puesto} value={p.puesto}>{p.puesto}</option>
        ))}
      </select>
    )
  )

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
          <SelectorPuesto
            className="w-full text-[12px] rounded-lg px-2.5 py-2 mt-1.5 cursor-pointer transition-colors"
            style={{ background: '#262B31', color: '#E5E7EB', border: '1px solid #3A3F47' }}
          />
        )}
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-brand-n500 uppercase tracking-widest flex items-center gap-1.5">
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
      {verComo && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-n500 pl-[1px]">Puesto dentro de {NOMBRE_DEPARTAMENTO[verComo]}:</span>
          <SelectorPuesto className="select w-auto text-sm py-1.5" />
        </div>
      )}
    </div>
  )
}
