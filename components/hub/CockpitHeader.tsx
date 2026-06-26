import type { LucideIcon } from 'lucide-react'

/**
 * Cabecera identitaria del área — la primera cosa que ve el usuario al entrar.
 * Gradiente de marca del departamento + saludo + rol + lema. Server component
 * puro (sin estado); la animación es 100% CSS (.cockpit-hero + .anim-*).
 */
export default function CockpitHeader({
  nombre,
  lema,
  Icon,
  grad,
  saludo,
  rol,
  fecha,
}: {
  nombre: string
  lema: string
  Icon: LucideIcon
  grad: [string, string]
  saludo: string
  rol?: string | null
  fecha: string
}) {
  return (
    <div
      className="cockpit-hero anim-fade-up mb-7"
      style={{ background: `linear-gradient(120deg, ${grad[0]}, ${grad[1]})` }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white/70 mb-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 anim-float" />
            {saludo} · {fecha}
          </div>
          <h1 className="text-2xl md:text-[30px] font-extrabold leading-tight tracking-tight">
            {nombre}
          </h1>
          {rol && (
            <div className="mt-1 text-sm font-medium text-white/80">{rol}</div>
          )}
          <p className="mt-3 text-sm md:text-[15px] text-white/85 max-w-xl leading-relaxed">
            {lema}
          </p>
        </div>

        {/* Icono grande del área — decorativo, flota sutilmente */}
        <div className="hidden sm:flex flex-shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/15 backdrop-blur-sm
                          border border-white/20 flex items-center justify-center anim-float">
            <Icon size={44} strokeWidth={1.6} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
