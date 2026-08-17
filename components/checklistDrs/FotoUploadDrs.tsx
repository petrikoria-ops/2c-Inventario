'use client'
import { useState, useEffect, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { subirFotoChecklistDrs, getSignedUrlChecklistDrs } from '@/lib/supabase/storage'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  checklistId: number
  itemId: number
  fotoUrl: string | null
  disabled?: boolean
  onUploaded: (path: string) => void
  onRemoved: () => void
}

export default function FotoUploadDrs({ checklistId, itemId, fotoUrl, disabled, onUploaded, onRemoved }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!fotoUrl) { setPreview(null); return }
    let cancelado = false
    getSignedUrlChecklistDrs(getSupabaseBrowser(), fotoUrl).then(url => { if (!cancelado) setPreview(url) })
    return () => { cancelado = true }
  }, [fotoUrl])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const path = await subirFotoChecklistDrs(getSupabaseBrowser(), checklistId, itemId, file)
      onUploaded(path)
      showToast('Foto subida', 'success')
    } catch (err: any) {
      showToast(err.message ?? 'Error al subir la foto', 'error')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFile} disabled={disabled || loading} />

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Evidencia fotográfica" className="w-12 h-12 rounded-md object-cover border" style={{ borderColor: '#E2E4E7' }} />
          {!disabled && (
            <button type="button" onClick={onRemoved}
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
  )
}
