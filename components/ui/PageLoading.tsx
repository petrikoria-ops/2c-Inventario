import { Loader2 } from 'lucide-react'

// Usado por los loading.tsx de cada ruta: Next.js lo muestra de inmediato
// al navegar (el sidebar cambia al instante) mientras el Server Component
// de la página sigue cargando datos de fondo — así la espera se siente
// como carga de datos, no como que la navegación esté trabada.
export default function PageLoading() {
  return (
    <div className="p-5 flex-1 flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Loader2 size={28} className="animate-spin" style={{ color: '#F0C000' }} />
      <p className="text-sm">Cargando…</p>
    </div>
  )
}
