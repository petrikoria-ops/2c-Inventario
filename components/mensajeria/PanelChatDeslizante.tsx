'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePresence, type ContactoChat } from '@/contexts/PresenceContext'
import HiloConversacion from './HiloConversacion'

// Drawer lateral montado una sola vez (ver AppShell) — cualquier botón de
// "mensaje" de la app llama abrirChatCon() desde el contexto en vez de
// montar su propio panel. Mismo patrón visual (fixed + overlay + translate)
// que el drawer móvil de components/layout/Sidebar.tsx.
export default function PanelChatDeslizante({ miId }: { miId: string | null }) {
  const { chatAbiertoCon, cerrarChat } = usePresence()
  const [ultimoContacto, setUltimoContacto] = useState<ContactoChat | null>(null)

  // Conserva el último contacto mientras el panel se desliza hacia afuera,
  // así no queda en blanco durante la animación de cierre.
  useEffect(() => {
    if (chatAbiertoCon) setUltimoContacto(chatAbiertoCon)
  }, [chatAbiertoCon])

  const abierto = !!chatAbiertoCon && !!miId

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 bg-black/40 z-[350]" onClick={cerrarChat} />
      )}
      <aside
        className={`fixed top-0 right-0 h-screen w-full sm:w-96 bg-white z-[400] shadow-2xl flex flex-col
                    transition-transform duration-300 ease-out ${abierto ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-end p-2 border-b flex-shrink-0" style={{ borderColor: '#EDEFF2' }}>
          <button onClick={cerrarChat} className="p-1.5 rounded hover:bg-slate-100 transition-colors" aria-label="Cerrar chat">
            <X size={16} />
          </button>
        </div>
        {ultimoContacto && miId && (
          <HiloConversacion contacto={ultimoContacto} miId={miId} />
        )}
      </aside>
    </>
  )
}
