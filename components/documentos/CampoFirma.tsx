'use client'
// Reusado en el cierre de Verificación RIC, Prevención de Riesgos y Test de
// Alimentadores: preview de la firma dibujada + botón para (re)firmar. No se
// acopla a un módulo — recibe el bucket y el path donde guardar/leer.
import { useState, useEffect } from 'react'
import { PenLine } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { getSignedUrlDeBucket } from '@/lib/supabase/storage'
import FirmaCanvas from './FirmaCanvas'

interface Props {
  bucket: string
  path: string
  firmaUrl: string | null
  label?: string
  disabled?: boolean
  onFirmaGuardada: (path: string) => void
}

export default function CampoFirma({ bucket, path, firmaUrl, label = 'Firma', disabled, onFirmaGuardada }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [firmando, setFirmando] = useState(false)

  useEffect(() => {
    if (!firmaUrl) { setPreview(null); return }
    let cancelado = false
    getSignedUrlDeBucket(getSupabaseBrowser(), bucket, firmaUrl).then(url => { if (!cancelado) setPreview(url) })
    return () => { cancelado = true }
  }, [bucket, firmaUrl])

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

      {firmando && (
        <FirmaCanvas
          bucket={bucket}
          path={path}
          onCancelar={() => setFirmando(false)}
          onGuardado={savedPath => { setFirmando(false); onFirmaGuardada(savedPath) }}
        />
      )}
    </div>
  )
}
