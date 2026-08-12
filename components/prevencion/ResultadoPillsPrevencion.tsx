'use client'

type Resultado = 'cumple' | 'no_cumple' | 'na' | null

const OPCIONES: { value: Exclude<Resultado, null>; label: string; activeClass: string }[] = [
  { value: 'cumple',    label: 'Cumple',    activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'no_cumple', label: 'No cumple', activeClass: 'bg-red-600 text-white border-red-600' },
  { value: 'na',        label: 'N/A',       activeClass: 'bg-slate-500 text-white border-slate-500' },
]

export default function ResultadoPillsPrevencion({ value, onChange, disabled }: {
  value: Resultado; onChange: (v: Exclude<Resultado, null>) => void; disabled?: boolean
}) {
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
