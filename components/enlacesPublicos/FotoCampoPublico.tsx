'use client'
import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

interface Props {
  token: string
  itemId: number
  previewUrlInicial?: string
  disabled?: boolean
  onUploaded: (path: string) => void
  onRemoved: () => void
}

export default function FotoCampoPublico({ token, itemId, previewUrlInicial, disabled, onUploaded, onRemoved }: Props) {
  const [preview, setPreview] = useState<string | null>(previewUrlInicial ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('itemId', String(itemId))
      form.append('file', file)
      const res = await fetch(`/api/publico/${token}/foto`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al subir la foto')
      setPreview(URL.createObjectURL(file))
      onUploaded(data.path)
    } catch (err: any) {
      setError(err.message ?? 'Error al subir la foto')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleFile} disabled={disabled || loading} />

        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Evidencia fotográfica" className="w-12 h-12 rounded-md object-cover border" style={{ borderColor: '#E2E4E7' }} />
            {!disabled && (
              <button type="button" onClick={() => { setPreview(null); onRemoved() }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center"
                aria-label="Quitar foto">
                <X size={10} />
              </button>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            {loading ? 'Subiendo…' : 'Foto'}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
