'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { fechaHora } from '@/lib/utils'
import type { ErrorLog } from '@/types'

export default function PanelErrores({ initialData }: { initialData: ErrorLog[] }) {
  const [errores, setErrores] = useState(initialData)
  const [abierto, setAbierto] = useState<number | null>(null)
  const [resolviendo, setResolviendo] = useState<number | null>(null)
  const { showToast } = useToast()
  const router = useRouter()

  const resolver = async (id: number) => {
    setResolviendo(id)
    try {
      const res = await fetch(`/api/admin/errors/${id}/resolver`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo marcar como resuelto')
      setErrores(prev => prev.map(e => e.id === id ? { ...e, resuelto: true } : e))
      showToast('Marcado como resuelto', 'success')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setResolviendo(null)
    }
  }

  const pendientes = errores.filter(e => !e.resuelto)
  const resueltos  = errores.filter(e => e.resuelto)

  const fila = (e: ErrorLog) => (
    <div key={e.id} className="border-b" style={{ borderColor: '#ECEEF1' }}>
      <div className="flex items-center gap-3 p-3">
        <button className="flex-1 text-left flex items-center gap-2" onClick={() => setAbierto(abierto === e.id ? null : e.id)}>
          {abierto === e.id ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{e.mensaje}</div>
            <div className="text-xs text-slate-400">
              {fechaHora(e.creado_en)} · {e.archivo ?? 'archivo desconocido'} · {e.usuario ?? 'usuario desconocido'}
              {e.departamento ? ` · ${e.departamento}` : ''}
            </div>
          </div>
        </button>
        {!e.resuelto && (
          <button disabled={resolviendo === e.id} className="btn btn-success btn-sm flex-shrink-0" onClick={() => resolver(e.id)}>
            <Check size={12} /> Resuelto
          </button>
        )}
        {e.resuelto && <span className="badge badge-green flex-shrink-0">Resuelto</span>}
      </div>
      {abierto === e.id && e.stack && (
        <pre className="text-[11px] bg-slate-50 text-slate-600 p-3 mx-3 mb-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{e.stack}</pre>
      )}
    </div>
  )

  return (
    <div className="panel">
      <div className="panel-header"><h2>Pendientes</h2><span className="badge badge-red">{pendientes.length}</span></div>
      {pendientes.length === 0
        ? <div className="p-6 text-center text-sm text-slate-400">Sin errores pendientes.</div>
        : pendientes.map(fila)}

      {resueltos.length > 0 && (
        <>
          <div className="panel-header" style={{ borderTop: '1px solid #ECEEF1' }}><h2>Resueltos</h2></div>
          {resueltos.map(fila)}
        </>
      )}
    </div>
  )
}
