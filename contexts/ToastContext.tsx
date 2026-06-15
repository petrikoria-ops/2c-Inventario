'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMsg {
  id: number
  msg: string
  type: ToastType
}

interface ToastCtx {
  showToast: (msg: string, type?: ToastType) => void
}

const Ctx = createContext<ToastCtx>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  let nextId = 0

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, []) // eslint-disable-line

  const bgMap: Record<ToastType, string> = {
    success: 'bg-green-700',
    error:   'bg-red-700',
    info:    'bg-slate-700',
  }

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      {/* Contenedor de toasts */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`${bgMap[t.type]} text-white px-5 py-2.5 rounded-lg shadow-lg text-sm
                        animate-[fadeUp_.25s_ease] whitespace-nowrap`}>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
