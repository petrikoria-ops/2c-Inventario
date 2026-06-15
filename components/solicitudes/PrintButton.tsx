'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-primary"
    >
      🖨 Imprimir / Guardar PDF
    </button>
  )
}
