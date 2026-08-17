'use client'
import { useState } from 'react'
import { PenLine } from 'lucide-react'
import FirmaCanvasPublico from './FirmaCanvasPublico'

interface Props {
  token: string
  campo: string          // ej. 'firma_imagen_url' — debe estar en camposCabeceraEditables del módulo
  previewUrlInicial: string | null
  label?: string
  disabled?: boolean
  onFirmaGuardada: (path: string) => void
}

export default function FirmaCampoPublico({ token, campo, previewUrlInicial, label = 'Firma', disabled, onFirmaGuardada }: Props) {
  const [preview, setPreview] = useState<string | null>(previewUrlInicial)
  const [firmando, setFirmando] = useState(false)

  const guardar = async (blob: Blob) => {
    const form = new FormData()
    form.append('campo', campo)
    form.append('file', blob, 'firma.png')
    const res = await fetch(`/api/publico/${token}/firma`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al guardar la firma')
    setPreview(URL.createObjectURL(blob))
    setFirmando(false)
    onFirmaGuardada(data.path)
  }

  return (
    <div>
      <label className="label">{label}</label>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-16 border rounded-md bg-white" style={{ borderColor: '#E2E4E7' }} />
          {!disabled && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setFirmando(true)}>
              <PenLine size={13} /> Rehacer firma
            </button>
          )}
        </div>
      ) : disabled ? (
        <p className="text-sm" style={{ color: 'var(--n-500)' }}>Sin firmar</p>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setFirmando(true)}>
          <PenLine size={13} /> Firmar
        </button>
      )}

      {firmando && <FirmaCanvasPublico onGuardar={guardar} onCancelar={() => setFirmando(false)} />}
    </div>
  )
}
