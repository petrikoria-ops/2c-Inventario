'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  puedeVerConectados as calculaPuedeVerConectados,
  puedeEnviarMensajes as calculaPuedeEnviarMensajes,
  puedeAsignarTareas as calculaPuedeAsignarTareas,
  type Perfil,
} from '@/lib/auth/permisos'

export interface ContactoChat {
  id: string
  nombre_completo: string
  puesto: string
  departamento: string
}

const EMPTY_SET: Set<string> = new Set()

interface PresenceCtx {
  conectados: Set<string>
  noLeidos: number
  chatAbiertoCon: ContactoChat | null
  abrirChatCon: (persona: ContactoChat) => void
  cerrarChat: () => void
  marcarLeidosLocal: (cantidad: number) => void
  // Gerente y Administración de software únicamente — ver contexts/PresenceContext.tsx.
  puedeVerConectados: boolean
  // Idem: solo Gerencia/Admin de software mandan mensajes. El resto de la
  // empresa recibe (notificación), no responde — no es un chat entre pares.
  puedeEnviarMensajes: boolean
  // Tareas asignadas a mí que siguen "pendiente" (sin aceptar/rechazar) —
  // badge del link "Itinerario" en la barra lateral.
  tareasPendientes: number
  marcarTareaRespondidaLocal: (cantidad: number) => void
  // Quién puede asignar tareas — más amplio que puedeEnviarMensajes a
  // propósito (incluye tier administrador), ver permisos.ts.
  puedeAsignarTareas: boolean
}

const Ctx = createContext<PresenceCtx>({
  conectados: new Set(),
  noLeidos: 0,
  chatAbiertoCon: null,
  abrirChatCon: () => {},
  cerrarChat: () => {},
  marcarLeidosLocal: () => {},
  puedeVerConectados: false,
  puedeEnviarMensajes: false,
  tareasPendientes: 0,
  marcarTareaRespondidaLocal: () => {},
  puedeAsignarTareas: false,
})

// Un solo canal de Presence + una sola suscripción a postgres_changes para
// toda la app — cualquier componente que necesite saber "quién está
// conectado" o "cuántos mensajes sin leer" consume este contexto en vez de
// abrir su propio socket. Mismo ciclo de vida channel()/subscribe()/
// removeChannel() que ya usa components/dashboard/AlertasStockRealtime.tsx.
export function PresenceProvider({ perfil, noLeidosInicial, tareasPendientesInicial = 0, children }: {
  perfil: Perfil | null
  noLeidosInicial: number
  tareasPendientesInicial?: number
  children: React.ReactNode
}) {
  const [conectados, setConectados] = useState<Set<string>>(new Set())
  const [noLeidos, setNoLeidos] = useState(noLeidosInicial)
  const [tareasPendientes, setTareasPendientes] = useState(tareasPendientesInicial)
  const [chatAbiertoCon, setChatAbiertoCon] = useState<ContactoChat | null>(null)

  useEffect(() => {
    setNoLeidos(noLeidosInicial)
  }, [noLeidosInicial])

  useEffect(() => {
    setTareasPendientes(tareasPendientesInicial)
  }, [tareasPendientesInicial])

  useEffect(() => {
    if (!perfil) return
    const sb = getSupabaseBrowser()
    const channel = sb.channel('presencia-global', { config: { presence: { key: perfil.id } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        setConectados(new Set(Object.keys(channel.presenceState())))
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `destinatario_id=eq.${perfil.id}` },
        () => setNoLeidos(n => n + 1),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tareas_asignadas', filter: `asignado_a=eq.${perfil.id}` },
        () => setTareasPendientes(n => n + 1),
      )
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: perfil.id,
            nombre_completo: perfil.nombre_completo,
            puesto: perfil.puesto,
            departamento: perfil.departamento,
          })
        }
      })

    return () => {
      channel.untrack()
      sb.removeChannel(channel)
    }
  }, [perfil?.id, perfil?.nombre_completo, perfil?.puesto, perfil?.departamento])

  const abrirChatCon = useCallback((persona: ContactoChat) => setChatAbiertoCon(persona), [])
  const cerrarChat = useCallback(() => setChatAbiertoCon(null), [])
  const marcarLeidosLocal = useCallback((cantidad: number) => setNoLeidos(n => Math.max(0, n - cantidad)), [])
  const marcarTareaRespondidaLocal = useCallback((cantidad: number) => setTareasPendientes(n => Math.max(0, n - cantidad)), [])

  // Se sigue rastreando/transmitiendo la presencia de todo el mundo (para
  // que la jefatura vea conectado a un Maestro), pero solo se EXPONE el
  // set de conectados a quien puede verlo — así un componente que se
  // olvide de chequear puedeVerConectados nunca termina mostrando a nadie
  // como "en línea" igual.
  const puedeVerConectados = calculaPuedeVerConectados(perfil)
  const conectadosVisibles = puedeVerConectados ? conectados : EMPTY_SET
  const puedeEnviarMensajes = calculaPuedeEnviarMensajes(perfil)
  const puedeAsignarTareas = calculaPuedeAsignarTareas(perfil)

  return (
    <Ctx.Provider value={{
      conectados: conectadosVisibles, noLeidos, chatAbiertoCon, abrirChatCon, cerrarChat, marcarLeidosLocal,
      puedeVerConectados, puedeEnviarMensajes,
      tareasPendientes, marcarTareaRespondidaLocal, puedeAsignarTareas,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePresence() {
  return useContext(Ctx)
}
