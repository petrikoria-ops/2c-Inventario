'use client'
// Botón de eliminar reutilizado en las tablas de verificaciones/mediciones
// (RIC, Checklist DRS, Prevención, Alimentadores) — mismo patrón simple de
// confirm() nativo que ya usa FormularioPruebaAlimentadores para eliminar
// un alimentador.
import { Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  url: string
  confirmMessage: string
  onDeleted: () => void
}

export default function BotonEliminarFila({ url, confirmMessage, onDeleted }: Props) {
  const { showToast } = useToast()

  const eliminar = async () => {
    if (!confirm(confirmMessage)) return
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) { showToast('No se pudo eliminar', 'error'); return }
    onDeleted()
  }

  return (
    <button type="button" className="btn-icon" style={{ color: '#DC2626' }} title="Eliminar" aria-label="Eliminar"
      onClick={eliminar}>
      <Trash2 size={13} />
    </button>
  )
}
