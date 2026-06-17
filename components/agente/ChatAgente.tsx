'use client'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, Trash2, Bot, User } from 'lucide-react'

interface Mensaje {
  rol:      'usuario' | 'agente'
  texto:    string
  rows?:    Record<string, unknown>[]
  columnas?: string[]
  titulo?:  string
  error?:   boolean
}

const SUGERENCIAS = [
  { categoria: 'Stock',        icon: '📦', texto: '¿Qué materiales están bajo stock mínimo?' },
  { categoria: 'Stock',        icon: '🚨', texto: '¿Qué materiales están sin stock?' },
  { categoria: 'Inventario',   icon: '💰', texto: '¿Cuál es el valor total del inventario?' },
  { categoria: 'Herramientas', icon: '🔧', texto: '¿Qué herramientas están en reparación?' },
  { categoria: 'Herramientas', icon: '👷', texto: '¿Qué herramientas tiene Juan?' },
  { categoria: 'Búsqueda',     icon: '🔍', texto: 'Busca cable THHN' },
  { categoria: 'Búsqueda',     icon: '🔍', texto: 'Busca terminal 10mm' },
  { categoria: 'Historial',    icon: '📋', texto: 'Muéstrame los últimos movimientos' },
  { categoria: 'Proyectos',    icon: '🏗️',  texto: '¿Cuáles son los proyectos activos?' },
  { categoria: 'Inventario',   icon: '📊', texto: 'Dame un resumen del inventario' },
]

export default function ChatAgente() {
  const [mensajes,  setMensajes]  = useState<Mensaje[]>([])
  const [input,     setInput]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = async (texto?: string) => {
    const pregunta = (texto ?? input).trim()
    if (!pregunta || cargando) return
    setInput('')
    setMensajes(prev => [...prev, { rol: 'usuario', texto: pregunta }])
    setCargando(true)
    try {
      const res  = await fetch('/api/agente', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pregunta }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error del servidor')
      setMensajes(prev => [...prev, {
        rol:      'agente',
        texto:    data.respuesta,
        rows:     data.rows,
        columnas: data.columnas,
        titulo:   data.titulo,
      }])
    } catch (e: any) {
      setMensajes(prev => [...prev, { rol: 'agente', texto: `Error: ${e.message}`, error: true }])
    } finally {
      setCargando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const limpiar = () => setMensajes([])

  return (
    <div className="flex flex-col flex-1 min-h-0 min-h-[500px]">
      {/* Historial */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Estado vacío — bienvenida + sugerencias */}
        {mensajes.length === 0 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#F0C000' }}>
                <Bot size={16} style={{ color: '#2E333A' }} />
              </div>
              <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-100 max-w-lg">
                <p className="text-sm font-semibold text-slate-800 mb-1">Hola, soy tu asistente de inventario</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Puedo consultarte el inventario en tiempo real: buscar materiales, ver alertas de stock,
                  herramientas por responsable, proyectos activos y más.
                  Los datos son reales — nunca invento información.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
                Preguntas frecuentes — haz clic para enviar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => enviar(s.texto)}
                    className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl
                               border border-slate-100 hover:border-amber-300 hover:bg-amber-50
                               text-left text-sm text-slate-700 font-medium transition-all shadow-sm
                               hover:shadow group">
                    <span className="text-base flex-shrink-0">{s.icon}</span>
                    <span className="leading-snug group-hover:text-slate-900">{s.texto}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mensajes */}
        {mensajes.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            {m.rol === 'agente' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#F0C000' }}>
                <Bot size={14} style={{ color: '#2E333A' }} />
              </div>
            )}

            <div className={`max-w-2xl ${m.rol === 'usuario' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              {/* Burbuja de texto */}
              <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed
                ${m.rol === 'usuario'
                  ? 'rounded-tr-none text-white'
                  : `rounded-tl-none border shadow-sm ${m.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-700'}`
                }`}
                style={m.rol === 'usuario' ? { background: '#2E333A' } : {}}>
                {m.texto}
              </div>

              {/* Tabla de datos */}
              {m.rows && m.rows.length > 0 && m.columnas && (
                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  {m.titulo && (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 bg-slate-50">
                      {m.titulo} — {m.rows.length} registro{m.rows.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {m.columnas.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap"
                            style={{ background: '#2E333A', color: '#9AA3AE', fontSize: 10 }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((row, ri) => (
                        <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                          {m.columnas!.map(col => (
                            <td key={col} className="px-3 py-2 border-b border-slate-100 align-middle whitespace-nowrap"
                              style={{ color: '#181818', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Resultado vacío de Supabase */}
              {m.rows && m.rows.length === 0 && !m.error && (
                <div className="text-xs text-slate-400 px-1">Sin datos que mostrar en la tabla.</div>
              )}
            </div>

            {m.rol === 'usuario' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#E2E4E7' }}>
                <User size={14} style={{ color: '#2E333A' }} />
              </div>
            )}
          </div>
        ))}

        {/* Indicador de carga */}
        {cargando && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#F0C000' }}>
              <Bot size={14} style={{ color: '#2E333A' }} />
            </div>
            <div className="bg-white border border-slate-100 rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
              <Loader2 size={14} className="animate-spin" style={{ color: '#F0C000' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sugerencias rápidas cuando ya hay mensajes */}
      {mensajes.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-slate-50 pt-2">
          {SUGERENCIAS.slice(0, 4).map((s, i) => (
            <button key={i} onClick={() => enviar(s.texto)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600
                         hover:border-amber-300 hover:bg-amber-50 transition-colors whitespace-nowrap">
              {s.icon} {s.texto}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2 items-end">
          {mensajes.length > 0 && (
            <button onClick={limpiar} title="Limpiar historial"
              className="btn btn-ghost btn-sm flex-shrink-0 self-end mb-0.5">
              <Trash2 size={13} />
            </button>
          )}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta… (Enter para enviar)"
              className="input w-full resize-none pr-10"
              style={{ minHeight: 42, maxHeight: 120, lineHeight: '1.5' }}
            />
          </div>
          <button onClick={() => enviar()}
            disabled={cargando || !input.trim()}
            className="btn btn-primary flex-shrink-0 self-end"
            style={{ height: 42 }}>
            {cargando
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 px-1">
          Datos en tiempo real desde Supabase · Solo lectura · Enter para enviar, Shift+Enter nueva línea
        </p>
      </div>
    </div>
  )
}
