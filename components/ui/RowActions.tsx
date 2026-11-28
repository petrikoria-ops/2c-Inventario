'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Acción de una fila de tabla. `hidden` permite dejarla fuera (p. ej. cuando el
// perfil no puede editar) sin armar el array condicionalmente en cada tabla.
export interface RowAction {
  label: string
  Icon: LucideIcon
  onClick?: () => void
  href?: string
  danger?: boolean
  hidden?: boolean
}

// Menú "⋯" de acciones de fila. Reemplaza la hilera de 3–5 botones de icono por
// un solo botón (área táctil 44px) que abre un menú. El menú se renderiza en un
// PORTAL con position:fixed para que NO lo recorte el overflow de la tabla/panel
// (el problema clásico de un dropdown dentro de `overflow-x-auto`). Se posiciona
// pegado al botón, alineado a su borde derecho, y se voltea hacia arriba si no
// cabe abajo. Cierra al elegir, al clic afuera, con Escape o al hacer scroll.
export default function RowActions({ actions, label = 'Acciones' }: { actions: RowAction[]; label?: string }) {
  const visibles = actions.filter(a => !a.hidden)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    const W = 212
    const estH = 8 + visibles.length * 40
    const left = Math.max(8, Math.min(b.right - W, window.innerWidth - W - 8))
    const cabeAbajo = b.bottom + estH + 8 <= window.innerHeight
    const top = cabeAbajo ? b.bottom + 4 : Math.max(8, b.top - estH - 4)
    setCoords({ top, left })
  }, [visibles.length])

  useEffect(() => {
    if (!open) return
    place()
    const cerrar = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, place])

  if (visibles.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
      >
        <MoreVertical size={16} />
      </button>

      {open && coords && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="row-actions-menu"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: 212 }}
        >
          {visibles.map((a, i) => {
            const cls = 'row-actions-item' + (a.danger ? ' is-danger' : '')
            const inner = <><a.Icon size={15} className="flex-shrink-0" /><span>{a.label}</span></>
            return a.href ? (
              <Link key={i} href={a.href} role="menuitem" className={cls} onClick={() => setOpen(false)}>{inner}</Link>
            ) : (
              <button key={i} type="button" role="menuitem" className={cls}
                onClick={() => { setOpen(false); a.onClick?.() }}>{inner}</button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
