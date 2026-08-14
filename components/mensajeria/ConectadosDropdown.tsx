'use client'
import { useState } from 'react'
import { Users, ChevronDown, MessageCircle } from 'lucide-react'
import { usePresence } from '@/contexts/PresenceContext'
import type { PerfilDirectorio } from '@/types'

// Widget compacto de la barra lateral: colapsado solo muestra la cantidad
// de gente en línea; al apretarlo se despliega y lista SOLO a quien está
// conectado ahora mismo (no el directorio completo con desconectados en
// gris — eso vivía antes en el Inicio). Ya viene gateado por
// puedeVerConectados a través de PresenceContext, pero además no renderiza
// nada si igual no hay a quién mostrar.
export default function ConectadosDropdown({ directorio, onNav }: { directorio: PerfilDirectorio[]; onNav?: () => void }) {
  const { conectados, abrirChatCon, puedeVerConectados } = usePresence()
  const [abierto, setAbierto] = useState(false)

  if (!puedeVerConectados || !directorio.length) return null

  const enLinea = directorio.filter(p => conectados.has(p.id))

  return (
    <div className="mx-3 mt-2">
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-[#3D4450]"
        style={{ color: '#9AA3AE' }}
        aria-expanded={abierto}
      >
        <Users size={13} className="flex-shrink-0" />
        <span className="flex-1 text-left">Conectados</span>
        <span className="badge badge-green text-[10px] px-1.5">{enLinea.length}</span>
        <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="mt-1 rounded-lg overflow-hidden" style={{ background: '#252932' }}>
          {enLinea.length === 0 ? (
            <p className="px-3 py-2.5 text-[11px]" style={{ color: '#6B7480' }}>Nadie más está conectado ahora.</p>
          ) : (
            enLinea.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#3D4450] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#059669' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-white truncate">{p.nombre_completo}</div>
                  <div className="text-[10px] truncate" style={{ color: '#6B7480' }}>{p.puesto}</div>
                </div>
                <button
                  type="button"
                  className="p-1 rounded flex-shrink-0 hover:bg-white/10 transition-colors"
                  aria-label={`Enviar mensaje a ${p.nombre_completo}`}
                  onClick={() => { abrirChatCon(p); onNav?.() }}
                >
                  <MessageCircle size={13} style={{ color: '#9AA3AE' }} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
