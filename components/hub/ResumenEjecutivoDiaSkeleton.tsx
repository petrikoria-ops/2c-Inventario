// Estado de carga del Resumen ejecutivo del día — usado como fallback de
// <Suspense> mientras ResumenEjecutivoDia (Server Component async) resuelve
// sus consultas, sin bloquear el resto del cockpit.
export default function ResumenEjecutivoDiaSkeleton() {
  return (
    <div className="mb-9 animate-pulse" aria-hidden="true">
      <div className="h-3 w-56 bg-slate-200 rounded mb-3" />
      <div className="panel mb-4">
        <div className="panel-header">
          <div className="h-3 w-40 bg-slate-200 rounded" />
        </div>
        <div className="p-4 space-y-2">
          <div className="h-3 w-full max-w-lg bg-slate-100 rounded" />
          <div className="h-3 w-full max-w-md bg-slate-100 rounded" />
          <div className="h-3 w-full max-w-sm bg-slate-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon bg-slate-100" />
            <div className="flex-1">
              <div className="h-4 w-10 bg-slate-200 rounded mb-1.5" />
              <div className="h-2.5 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel h-40" />
        <div className="panel h-40" />
      </div>
    </div>
  )
}
