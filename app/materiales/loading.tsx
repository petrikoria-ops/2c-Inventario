import { Plug, Loader2 } from 'lucide-react'

// Next.js muestra este archivo de inmediato al navegar a /materiales,
// antes de que termine la consulta a la base de datos (que con un
// catálogo grande puede tardar unos segundos). Así la navegación se
// siente instantánea y queda claro que la espera es la carga de datos,
// no la página.
export default function LoadingMateriales() {
  return (
    <div className="p-5">
      <div className="panel">
        <div className="panel-header">
          <Plug size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Materiales</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin" style={{ color: '#F0C000' }} />
          <p className="text-sm">Cargando inventario desde la base de datos…</p>
        </div>
      </div>
    </div>
  )
}
