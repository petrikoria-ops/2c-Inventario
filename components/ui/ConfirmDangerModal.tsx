'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmWord?: string
  confirming?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

// Confirmación reforzada para acciones masivas/irreversibles: el usuario debe
// escribir una palabra exacta antes de habilitar el botón de eliminar.
// Un solo "Aceptar" de un confirm() nativo ya causó una desactivación masiva
// real del catálogo — esto exige una acción deliberada adicional.
export default function ConfirmDangerModal({
  open, title, message, confirmWord = 'ELIMINAR', confirming, onConfirm, onClose,
}: Props) {
  const [text, setText] = useState('')

  useEffect(() => { if (open) setText('') }, [open])

  const match = text.trim().toUpperCase() === confirmWord.toUpperCase()

  return (
    <Modal open={open} title={title} onClose={onClose} hideFooter>
      <div className="flex gap-3">
        <AlertTriangle size={20} className="flex-shrink-0 text-red-500 mt-0.5" />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-4">
        <label className="label" htmlFor="confirm-danger-input">
          Escribe <strong className="text-red-600">{confirmWord}</strong> para confirmar
        </label>
        <input
          id="confirm-danger-input"
          autoFocus
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && match && !confirming) onConfirm() }}
          placeholder={confirmWord}
        />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={onClose} disabled={confirming}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={!match || confirming}>
          {confirming ? 'Eliminando…' : 'Eliminar definitivamente'}
        </button>
      </div>
    </Modal>
  )
}
