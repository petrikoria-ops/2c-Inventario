'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, ClipboardPlus } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { usePresence, type ContactoChat } from '@/contexts/PresenceContext'
import { useToast } from '@/contexts/ToastContext'
import { NOMBRE_DEPARTAMENTO } from '@/lib/auth/deptInfo'
import NuevaTareaModal from '@/components/tareas/NuevaTareaModal'
import type { Mensaje } from '@/types'

interface Props {
  contacto: ContactoChat
  miId: string
}

// Hilo de una conversación 1:1 — lo comparten el panel deslizante
// (components/mensajeria/PanelChatDeslizante.tsx) y la página /mensajes,
// para no duplicar la lógica de carga/envío/tiempo real.
export default function HiloConversacion({ contacto, miId }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tareaModalAbierta, setTareaModalAbierta] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const { marcarLeidosLocal, conectados, puedeVerConectados, puedeEnviarMensajes, puedeAsignarTareas } = usePresence()
  const { showToast } = useToast()

  const marcarLeidos = () => {
    fetch('/api/mensajes/marcar-leidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remitente_id: contacto.id }),
    })
      .then(r => r.json())
      .then(d => marcarLeidosLocal(d.marcados ?? 0))
      .catch(() => {})
  }

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    fetch(`/api/mensajes?con=${contacto.id}`)
      .then(r => r.json())
      .then(data => { if (!cancelado) setMensajes(data) })
      .finally(() => { if (!cancelado) setCargando(false) })
    marcarLeidos()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacto.id])

  useEffect(() => {
    const sb = getSupabaseBrowser()
    const channel = sb
      .channel(`hilo-${miId}-${contacto.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `destinatario_id=eq.${miId}` },
        (payload: { new: Mensaje }) => {
          const nuevo = payload.new
          if (nuevo.remitente_id !== contacto.id) return
          setMensajes(prev => [...prev, nuevo])
          marcarLeidos()
        },
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacto.id, miId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  const enviar = async () => {
    const contenido = texto.trim()
    if (!contenido || enviando) return
    setEnviando(true)
    setTexto('')
    try {
      const res = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario_id: contacto.id, contenido }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el mensaje')
      setMensajes(prev => [...prev, data])
    } catch (e: any) {
      showToast(e.message, 'error')
      setTexto(contenido)
    } finally {
      setEnviando(false)
    }
  }

  const enLinea = conectados.has(contacto.id)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#EDEFF2' }}>
        {puedeVerConectados && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: enLinea ? '#059669' : '#C0C4CC' }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">{contacto.nombre_completo}</div>
          <div className="text-[11px] text-brand-n500 truncate">
            {contacto.puesto} · {NOMBRE_DEPARTAMENTO[contacto.departamento] ?? contacto.departamento}
            {puedeVerConectados && ` · ${enLinea ? 'En línea' : 'Desconectado'}`}
          </div>
        </div>
        {puedeAsignarTareas && (
          <button
            type="button"
            className="btn btn-outline btn-sm flex-shrink-0"
            onClick={() => setTareaModalAbierta(true)}
            title={`Asignar una tarea a ${contacto.nombre_completo}`}
          >
            <ClipboardPlus size={13} /> Asignar tarea
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {cargando ? (
          <p className="text-center text-xs text-brand-n500 py-6">Cargando…</p>
        ) : mensajes.length === 0 ? (
          <p className="text-center text-xs text-brand-n500 py-6">
            {puedeEnviarMensajes ? 'Todavía no hay mensajes — escribe el primero.' : 'Todavía no has recibido ningún mensaje de esta persona.'}
          </p>
        ) : (
          mensajes.map(m => {
            const esMio = m.remitente_id === miId
            return (
              <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${esMio ? 'text-white' : 'text-slate-800'}`}
                  style={{ background: esMio ? '#2E333A' : '#F0F1F3' }}
                >
                  {m.contenido}
                </div>
              </div>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      {puedeEnviarMensajes ? (
        <div className="flex gap-2 p-3 border-t flex-shrink-0" style={{ borderColor: '#EDEFF2' }}>
          <input
            className="input flex-1"
            placeholder="Escribe un mensaje…"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') enviar() }}
          />
          <button className="btn btn-primary btn-sm" onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar mensaje">
            <Send size={13} />
          </button>
        </div>
      ) : (
        <div className="px-4 py-2.5 border-t flex-shrink-0 text-center text-[11px]" style={{ borderColor: '#EDEFF2', color: 'var(--n-500)' }}>
          Esto es una notificación — no se puede responder.
        </div>
      )}

      {puedeAsignarTareas && (
        <NuevaTareaModal
          abierto={tareaModalAbierta}
          onClose={() => setTareaModalAbierta(false)}
          destinatarioInicial={contacto}
        />
      )}
    </div>
  )
}
