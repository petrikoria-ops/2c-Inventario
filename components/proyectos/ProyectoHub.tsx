'use client'
import Link from 'next/link'
import { ClipboardCheck, ShieldCheck, ArrowRight, Plus } from 'lucide-react'
import { BadgeEstadoProy } from '@/components/ui/Badge'
import TrabajadoresObra from './TrabajadoresObra'
import AvanceObra from './AvanceObra'
import type { Proyecto, ProyectoTrabajador, AvanceObra as AvanceObraType, AvanceObraItem, VerificacionRic } from '@/types'

interface Props {
  proyecto: Proyecto
  initialTrabajadores: ProyectoTrabajador[]
  initialAvance: (AvanceObraType & { avances_obra_items: AvanceObraItem[] }) | null
  verificaciones: Pick<VerificacionRic, 'id' | 'numero' | 'fecha_visita' | 'estado'>[]
  editableProyecto: boolean
  editableAvance: boolean
  editableRic: boolean
  esVisitador: boolean
}

export default function ProyectoHub({
  proyecto, initialTrabajadores, initialAvance, verificaciones,
  editableProyecto, editableAvance, editableRic, esVisitador,
}: Props) {
  return (
    <div className="p-5 w-full max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="code">{proyecto.ot}</span>
            <BadgeEstadoProy estado={proyecto.estado} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">{proyecto.nombre}</h1>
          {proyecto.cliente && <p className="text-sm text-brand-n500">{proyecto.cliente}</p>}
        </div>
        <Link href={`/proyectos/${proyecto.id}/factibilidad`} className="btn btn-outline btn-sm">
          <ClipboardCheck size={13} /> Factibilidad
        </Link>
      </div>

      <div className="space-y-5">
        <TrabajadoresObra proyectoId={proyecto.id} initialData={initialTrabajadores} editable={editableProyecto} />

        <AvanceObra proyectoId={proyecto.id} initialAvance={initialAvance} esVisitador={esVisitador} editable={editableAvance} />

        {/* Verificaciones RIC */}
        <div className="panel">
          <div className="panel-header">
            <ShieldCheck size={14} style={{ color: 'var(--n-500)' }} />
            <h2>Verificaciones RIC N°18/19</h2>
            {editableRic && (
              <Link href={`/verificacion-ric/nueva?proyecto=${proyecto.id}`} className="btn btn-primary btn-sm ml-auto">
                <Plus size={13} /> Nueva
              </Link>
            )}
          </div>
          {verificaciones.length === 0 ? (
            <div className="p-6 text-center text-brand-n500 text-sm">
              Esta obra todavía no tiene ninguna verificación RIC registrada.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {verificaciones.map(v => (
                <Link key={v.id} href={`/verificacion-ric/${v.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <span className="code">{v.numero}</span>
                  <span className="text-xs text-brand-n500">{new Date(v.fecha_visita).toLocaleDateString('es-CL')}</span>
                  <span className={`badge ml-auto ${v.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                    {v.estado === 'completa' ? 'Completa' : 'En progreso'}
                  </span>
                  <ArrowRight size={14} className="text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
