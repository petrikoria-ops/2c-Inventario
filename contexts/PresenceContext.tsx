'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/auth/permisos'

export interface ContactoChat {
  id: string
  nombre_completo: string
  puesto: string
  departamento: string
}

interface PresenceCtx {
  conectados: Set<string>
  noLeidos: number
  chatAbiertoCon: ContactoChat | null
  abrirChatCon: (persona: ContactoChat) => void
  cerrarChat: () => void
  marcarLeidosLocal: (cantidad: number) => void
}

const Ctx = createContext<PresenceCtx>({
  conectados: new Set(),
  noLeidos: 0,
  chatAbiertoCon: null,
  abrirChatCon: () => {},
  cerrarChat: () => {},
  marcarLeidosLocal: () => {},
})

// Un solo canal de Presence + una sola suscripción a postgres_changes para
// toda la app — cualquier componente que necesite saber "quién está
// conectado" o "cuántos mensajes sin leer" consume este contexto en vez de
// abrir su propio socket. Mismo ciclo de vida channel()/subscribe()/
// removeChannel() que ya usa components/dashboard/AlertasStockRealtime.tsx.
export function PresenceProvider({ perfil, noLeidosInicial, children }: {
  perfil: Perfil | null
  noLeidosInicial: number
  children: React.ReactNode
}) {
  const [conectados, setConectados] = useState<Set<string>>(new Set())
  const [noLeidos, setNoLeidos] = useState(noLeidosInicial)
  const [chatAbiertoCon, setChatAbiertoCon] = useState<ContactoChat | null>(null)

  useEffect(() => {
    setNoLeidos(noLeidosInicial)
  }, [noLeidosInicial])

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

  return (
    <Ctx.Provider value={{ conectados, noLeidos, chatAbiertoCon, abrirChatCon, cerrarChat, marcarLeidosLocal }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePresence() {
  return useContext(Ctx)
}
