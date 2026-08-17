'use client'
// Captura de firma táctil para la página pública de /completar — mismo UI
// que components/documentos/FirmaCanvas.tsx, pero en vez de subir directo a
// Storage con el cliente del navegador (exige sesión `authenticated`, y acá
// no hay sesión) entrega el blob al padre, que lo manda a
// /api/publico/[token]/firma.
import { useRef, useState } from 'react'
import { Check, Eraser, X, Loader2 } from 'lucide-react'

interface Props {
  onGuardar: (blob: Blob) => Promise<void>
  onCancelar: () => void
}

export default function FirmaCanvasPublico({ onGuardar, onCancelar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const preparado = useRef(false)
  const dibujando = useRef(false)
  const vacio = useRef(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const prepararCanvas = () => {
    if (preparado.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#181818'
    }
    preparado.current = true
  }

  const coords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    prepararCanvas()
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    dibujando.current = true
    const { x, y } = coords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = coords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    vacio.current = false
  }

  const onPointerUp = () => { dibujando.current = false }

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    vacio.current = true
  }

  const guardar = () => {
    const canvas = canvasRef.current
    if (!canvas || vacio.current) { setErrorMsg('Dibuja la firma antes de guardar'); return }
    setErrorMsg('')
    setSaving(true)
    canvas.toBlob(async blob => {
      if (!blob) { setSaving(false); return }
      try {
        await onGuardar(blob)
      } catch (err: any) {
        setErrorMsg(err.message ?? 'Error al guardar la firma')
        setSaving(false)
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[600] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: 'min(80vh, 480px)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E8EAED' }}>
          <h3 className="font-semibold text-[15px]" style={{ color: '#181818' }}>Firma con el dedo</h3>
          <button onClick={onCancelar} className="p-1.5 rounded transition-colors hover:bg-slate-100" style={{ color: 'var(--n-500)' }} aria-label="Cerrar">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 relative m-3 rounded-lg overflow-hidden" style={{ border: '2px dashed #D8DBE0' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b" style={{ borderColor: '#C0C4CC' }} />
        </div>

        {errorMsg && <p className="px-4 text-xs text-red-600">{errorMsg}</p>}

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t" style={{ borderColor: '#E8EAED' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar} disabled={saving}>
            <Eraser size={13} /> Borrar
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelar} disabled={saving}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={guardar} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? 'Guardando…' : 'Guardar firma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
