'use client'

type Resultado = 'pasa' | 'no_pasa' | 'na' | null

const CLASES: Record<Exclude<Resultado, null>, string> = {
  pasa:    'bg-emerald-600 text-white border-emerald-600',
  no_pasa: 'bg-red-600 text-white border-red-600',
  na:      'bg-slate-500 text-white border-slate-500',
}

// labels por defecto: Pasa/No pasa/N-A. Algunos protocolos (ej. Checklist
// DRS) usan otro vocabulario para el mismo semáforo de 3 estados — ej.
// "Aplica/No aplica/N-A" o "Sin/Con temperaturas relevantes" — se pasa
// labels=[pasa,no_pasa,na] para sobreescribir el texto sin duplicar el componente.
export default function ResultadoPills({ value, onChange, disabled, labels }: {
  value: Resultado; onChange: (v: Exclude<Resultado, null>) => void; disabled?: boolean
  labels?: [string, string, string]
}) {
  const OPCIONES: { value: Exclude<Resultado, null>; label: string; activeClass: string }[] = [
    { value: 'pasa',    label: labels?.[0] ?? 'Pasa',    activeClass: CLASES.pasa },
    { value: 'no_pasa', label: labels?.[1] ?? 'No pasa', activeClass: CLASES.no_pasa },
    { value: 'na',      label: labels?.[2] ?? 'N/A',     activeClass: CLASES.na },
  ]
  return (
    <div className="flex gap-1.5 flex-shrink-0">
      {OPCIONES.map(op => (
        <button
          key={op.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(op.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-default ${
            value === op.value ? op.activeClass : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
