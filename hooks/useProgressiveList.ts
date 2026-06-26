'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Renderizado progresivo de listas largas: en vez de pintar 2.000+ filas de
 * golpe (lento), muestra `initial` y va cargando `step` más a medida que el
 * usuario se acerca al final (IntersectionObserver) o pulsa "Cargar más".
 *
 * Los datos ya vienen completos del servidor (el filtrado/orden se hace en
 * memoria sobre todo el set); esto solo limita cuántos se PINTAN, así la tabla
 * aparece al instante y sigue creciendo sola.
 *
 * Se reinicia al `initial` cuando cambia la lista (nuevos filtros, orden o
 * datos), para no quedar mostrando un recorte viejo.
 */
export function useProgressiveList<T>(items: T[], step = 60, initial = 60) {
  const [count, setCount] = useState(initial)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reinicia el recorte cuando cambia la identidad de la lista (el array es
  // nuevo cada vez que cambian filtros/orden/datos gracias al useMemo origen).
  useEffect(() => { setCount(initial) }, [items, initial])

  const hasMore = count < items.length
  const visible = hasMore ? items.slice(0, count) : items

  const loadMore = useCallback(
    () => setCount(c => Math.min(c + step, items.length)),
    [step, items.length],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setCount(c => c + step) },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, step])

  return { visible, hasMore, sentinelRef, loadMore, count: visible.length, total: items.length }
}
