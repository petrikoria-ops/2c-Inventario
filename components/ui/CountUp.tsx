'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Contador que anima de 0 hasta `value` la primera vez que entra en pantalla.
 * `format` permite mostrar miles/moneda (ej. (n) => clp(n)). Respeta
 * prefers-reduced-motion: si está activo, muestra el valor final sin animar.
 */
export default function CountUp({
  value,
  durationMs = 900,
  format = (n: number) => Math.round(n).toLocaleString('es-CL'),
  className = '',
}: {
  value: number
  durationMs?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const run = () => {
      if (started.current) return
      started.current = true
      if (reduce || value === 0) { setDisplay(value); return }
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / durationMs)
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3)
        setDisplay(value * eased)
        if (p < 1) requestAnimationFrame(tick)
        else setDisplay(value)
      }
      requestAnimationFrame(tick)
    }

    if (typeof IntersectionObserver === 'undefined') { run(); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { run(); io.disconnect() }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value, durationMs])

  return <span ref={ref} className={className}>{format(display)}</span>
}
