import ChatAgente from '@/components/agente/ChatAgente'
import { Bot } from 'lucide-react'

export const metadata = { title: 'Agente IA | 2C Inventario' }

export default function AgentePage() {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header fijo */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: '#F0C000' }}>
          <Bot size={16} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800">Agente IA de inventario</h1>
          <p className="text-xs text-slate-400">Consultas en lenguaje natural · datos reales · solo lectura</p>
        </div>
      </div>

      {/* Chat — ocupa el resto */}
      <div className="flex-1 overflow-hidden">
        <ChatAgente />
      </div>
    </div>
  )
}
