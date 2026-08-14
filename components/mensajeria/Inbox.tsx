'use client'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, Search } from 'lucide-react'
import { usePresence } from '@/contexts/PresenceContext'
import HiloConversacion from './HiloConversacion'
import type { Mensaje, PerfilDirectorio } from '@/types'

interface Props {
  miId: string
  directorio: PerfilDirectorio[]
  mensajesIniciales: Mensaje[]
}

export default function Inbox({ miId, directorio, mensajesIniciales }: Props) {
  const { conectados, puedeVerConectados } = usePresence()
  const searchParams = useSearchParams()
  const [seleccionado, setSeleccionado] = useState<string | null>(searchParams.get('con'))
  const [busqueda, setBusqueda] = useState('')

  const conversaciones = useMemo(() => {
    const ultimoPorContacto = new Map<string, Mensaje>()
    const noLeidosPorContacto = new Map<string, number>()
    for (const m of mensajesIniciales) {
      const otroId = m.remitente_id === miId ? m.destinatario_id : m.remitente_id
      const actual = ultimoPorContacto.get(otroId)
      if (!actual || new Date(m.creado_en) > new Date(actual.creado_en)) ultimoPorContacto.set(otroId, m)
      if (m.destinatario_id === miId && !m.leido_en) {
        noLeidosPorContacto.set(otroId, (noLeidosPorContacto.get(otroId) ?? 0) + 1)
      }
    }
    return directorio
      .map(p => ({ persona: p, ultimo: ultimoPorContacto.get(p.id) ?? null, noLeidos: noLeidosPorContacto.get(p.id) ?? 0 }))
      .filter((c): c is { persona: PerfilDirectorio; ultimo: Mensaje; noLeidos: number } => c.ultimo !== null)
      .sort((a, b) => new Date(b.ultimo.creado_en).getTime() - new Date(a.ultimo.creado_en).getTime())
  }, [mensajesIniciales, directorio, miId])

  const sinConversacion = directorio.filter(p =>
    busqueda.trim() &&
    !conversaciones.some(c => c.persona.id === p.id) &&
    p.nombre_completo.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  const contactoActivo = directorio.find(p => p.id === seleccionado) ?? null

  return (
    <div className="p-5 w-full max-w-5xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-4">Mensajes</h1>
      <div className="panel overflow-hidden" style={{ height: '75vh' }}>
        <div className="flex h-full">
          {/* Lista de conversaciones */}
          <div className={`w-full sm:w-72 flex-shrink-0 border-r flex-col ${contactoActivo ? 'hidden sm:flex' : 'flex'}`} style={{ borderColor: '#EDEFF2' }}>
            <div className="p-3 border-b flex-shrink-0" style={{ borderColor: '#EDEFF2' }}>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-n500" />
                <input className="input pl-7 text-xs" placeholder="Buscar persona…" value={busqueda}
                  onChange={e => setBusqueda(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {conversaciones.map(c => (
                <button key={c.persona.id}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-b hover:bg-slate-50 transition-colors ${seleccionado === c.persona.id ? 'bg-slate-100' : ''}`}
                  style={{ borderColor: '#EDEFF2' }}
                  onClick={() => setSeleccionado(c.persona.id)}
                >
                  {puedeVerConectados && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: conectados.has(c.persona.id) ? '#059669' : '#C0C4CC' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{c.persona.nombre_completo}</span>
                      {c.noLeidos > 0 && <span className="badge badge-red text-[10px] px-1.5 flex-shrink-0">{c.noLeidos}</span>}
                    </div>
                    <div className="text-[11px] text-brand-n500 truncate">{c.ultimo.contenido}</div>
                  </div>
                </button>
              ))}
              {busqueda.trim() && sinConversacion.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-brand-n500 font-semibold">Iniciar conversación</div>
                  {sinConversacion.map(p => (
                    <button key={p.id} className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors"
                      onClick={() => { setSeleccionado(p.id); setBusqueda('') }}
                    >
                      {puedeVerConectados && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: conectados.has(p.id) ? '#059669' : '#C0C4CC' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">{p.nombre_completo}</div>
                        <div className="text-[11px] text-brand-n500 truncate">{p.puesto}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {!conversaciones.length && !busqueda.trim() && (
                <p className="text-center text-xs text-brand-n500 p-6">Todavía no tienes conversaciones. Busca a alguien para empezar.</p>
              )}
            </div>
          </div>

          {/* Hilo abierto */}
          <div className={`flex-1 min-w-0 flex-col ${contactoActivo ? 'flex' : 'hidden sm:flex'}`}>
            {contactoActivo ? (
              <>
                <button className="sm:hidden flex items-center gap-1.5 px-3 py-2 text-xs text-brand-n500 border-b flex-shrink-0"
                  style={{ borderColor: '#EDEFF2' }} onClick={() => setSeleccionado(null)}>
                  <ArrowLeft size={13} /> Conversaciones
                </button>
                <HiloConversacion contacto={contactoActivo} miId={miId} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 text-brand-n500 text-sm">
                <MessageCircle size={16} /> Selecciona una conversación
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
