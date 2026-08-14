'use client'
import { MessageCircle, Users } from 'lucide-react'
import { usePresence } from '@/contexts/PresenceContext'
import { NOMBRE_DEPARTAMENTO } from '@/lib/auth/deptInfo'
import type { PerfilDirectorio } from '@/types'

export default function ListaConectados({ personas }: { personas: PerfilDirectorio[] }) {
  const { conectados, abrirChatCon } = usePresence()

  const ordenadas = [...personas].sort((a, b) => {
    const enLineaA = conectados.has(a.id) ? 0 : 1
    const enLineaB = conectados.has(b.id) ? 0 : 1
    return enLineaA - enLineaB || a.nombre_completo.localeCompare(b.nombre_completo)
  })
  const enLineaCount = personas.filter(p => conectados.has(p.id)).length

  return (
    <div className="panel mb-9">
      <div className="panel-header">
        <Users size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Quién está conectado</h2>
        <span className="ml-2 badge badge-green">{enLineaCount} en línea</span>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: '#EDEFF2' }}>
        {ordenadas.map(p => {
          const enLinea = conectados.has(p.id)
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: enLinea ? '#059669' : '#C0C4CC' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">{p.nombre_completo}</div>
                <div className="text-[11px] text-brand-n500 truncate">
                  {p.puesto} · {NOMBRE_DEPARTAMENTO[p.departamento] ?? p.departamento}
                </div>
              </div>
              <button
                className="btn-icon flex-shrink-0"
                title={`Enviar mensaje a ${p.nombre_completo}`}
                aria-label={`Enviar mensaje a ${p.nombre_completo}`}
                onClick={() => abrirChatCon(p)}
              >
                <MessageCircle size={15} />
              </button>
            </div>
          )
        })}
        {!ordenadas.length && (
          <p className="px-4 py-6 text-center text-sm text-brand-n500">Todavía no hay más personas activas en el sistema.</p>
        )}
      </div>
    </div>
  )
}
