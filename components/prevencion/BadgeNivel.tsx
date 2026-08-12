import { getNivelRiesgo, type NivelRiesgo } from '@/lib/prevencion/clasificacionRiesgo'

export default function BadgeNivel({ nivel }: { nivel: NivelRiesgo | null | undefined }) {
  const info = getNivelRiesgo(nivel ?? undefined)
  if (!info) return <span className="text-brand-n500 text-xs">—</span>
  return (
    <span className="badge text-[11px] font-semibold" style={{ background: `#${info.color}22`, color: `#${info.color}` }}>
      {info.nombre}
    </span>
  )
}
