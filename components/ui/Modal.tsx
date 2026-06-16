'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  onSave?: () => void | Promise<void>
  saveLabel?: string
  saving?: boolean
  wide?: boolean
  children: React.ReactNode
  hideFooter?: boolean
}

export default function Modal({
  open, title, onClose, onSave, saveLabel = 'Guardar',
  saving, wide, children, hideFooter,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col w-full max-h-[90vh]
                    animate-[modalIn_.2s_ease] ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b" style={{ borderColor: '#E8EAED' }}>
          <h3 className="font-semibold flex-1 text-[15px]" style={{ color: '#181818' }}>{title}</h3>
          <button onClick={onClose}
            className="p-1.5 rounded transition-colors hover:bg-slate-100"
            style={{ color: '#909090' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto">{children}</div>

        {/* Footer */}
        {!hideFooter && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: '#E8EAED' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            {onSave && (
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? 'Guardando…' : saveLabel}
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-16px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
