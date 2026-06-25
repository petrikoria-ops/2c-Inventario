import Link from 'next/link'
import { ShieldAlert, CheckSquare } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { BadgeEstadoHer } from '@/components/ui/Badge'

export default async function WidgetPrevencion() {
  const sb = getSupabaseServer()

  const { data: herramientas } = await sb
    .from('herramientas')
    .select('id,codigo,descripcion,estado')
    .in('estado', ['en_reparacion', 'extraviada'])
    .eq('activo', true)
    .limit(8)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel">
        <div className="panel-header">
          <ShieldAlert size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Herramientas con problema</h2>
          <Link href="/herramientas" className="btn btn-ghost btn-sm">Ver todas →</Link>
        </div>
        {!herramientas?.length ? (
          <div className="p-6 text-center text-sm text-slate-400">No hay herramientas en reparación ni extraviadas.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {herramientas.map(h => (
              <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate"><span className="code mr-1">{h.codigo}</span>{h.descripcion}</div>
                </div>
                <BadgeEstadoHer estado={h.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <CheckSquare size={14} style={{ color: '#909090', flexShrink: 0 }} />
          <h2>Checklist tablero</h2>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-sm text-slate-500">
            Usa la checklist de armado y pruebas para dejar registro de cada tablero antes de su entrega.
          </p>
          <Link href="/checklist" className="btn btn-primary btn-sm">
            <CheckSquare size={13} /> Abrir checklist
          </Link>
        </div>
      </div>
    </div>
  )
}
