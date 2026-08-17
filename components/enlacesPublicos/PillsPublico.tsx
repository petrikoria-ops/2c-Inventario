'use client'
// Selector de 3 estados (ej. Pasa/No pasa/N-A, o Cumple/No cumple/N-A) — sin
// depender de los ResultadoPills internos, que están acoplados a sus módulos.
interface Props {
  value: string | null
  opciones: [string, string, string]   // [valorPositivo, valorNegativo, valorNa]
  labels?: [string, string, string]
  disabled?: boolean
  onChange: (v: string) => void
}

const COLOR: Record<number, { activo: string; texto: string }> = {
  0: { activo: '#ECFDF5', texto: '#059669' },
  1: { activo: '#FEF2F2', texto: '#DC2626' },
  2: { activo: '#F5F6F7', texto: '#6B7280' },
}

export default function PillsPublico({ value, opciones, labels, disabled, onChange }: Props) {
  const etiquetas = labels ?? ['Pasa', 'No pasa', 'N/A']
  return (
    <div className="flex gap-1">
      {opciones.map((op, i) => (
        <button
          key={op}
          type="button"
          disabled={disabled}
          onClick={() => onChange(op)}
          className="text-xs px-2 py-1 rounded-md border font-medium transition-colors disabled:opacity-60"
          style={{
            borderColor: value === op ? COLOR[i].texto : '#E2E4E7',
            background: value === op ? COLOR[i].activo : '#FFFFFF',
            color: value === op ? COLOR[i].texto : '#6B7280',
          }}
        >
          {etiquetas[i]}
        </button>
      ))}
    </div>
  )
}
