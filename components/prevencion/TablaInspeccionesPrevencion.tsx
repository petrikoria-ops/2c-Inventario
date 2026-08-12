'use client'
import Link from 'next/link'
import { ShieldAlert, Plus } from 'lucide-react'
import type { InspeccionPrevencion } from '@/types'

type InspeccionConConteo = InspeccionPrevencion & { hallazgos_count?: number }

export default function TablaInspeccionesPrevencion({ initialData, editable }: { initialData: InspeccionConConteo[]; editable: boolean }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <ShieldAlert size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Inspecciones de faena (DS 594)</h2>
        {editable && (
          <Link href="/prevencion-riesgos/nueva" className="btn btn-primary btn-sm ml-auto">
            <Plus size={13} /> Nueva inspección
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">N°</th>
              <th className="th">Centro de trabajo</th>
              <th className="th">Fecha</th>
              <th className="th">Prevencionista</th>
              <th className="th">Estado</th>
              <th className="th text-right">Hallazgos abiertos</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map(i => (
              <tr key={i.id} className="tr-hover">
                <td className="td"><Link href={`/prevencion-riesgos/${i.id}`} className="code hover:underline">{i.numero}</Link></td>
                <td className="td">{i.centro_trabajo}</td>
                <td className="td text-xs text-brand-n500">{new Date(i.fecha).toLocaleDateString('es-CL')}</td>
                <td className="td text-xs text-brand-n500">{i.prevencionista ?? '—'}</td>
                <td className="td">
                  <span className={`badge ${i.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                    {i.estado === 'completa' ? 'Completa' : 'En progreso'}
                  </span>
                </td>
                <td className="td-r">
                  {!!i.hallazgos_count && (
                    <span className="badge badge-red text-[11px]">{i.hallazgos_count}</span>
                  )}
                  {!i.hallazgos_count && <span className="text-brand-n500 text-xs">0</span>}
                </td>
              </tr>
            ))}
            {!initialData.length && (
              <tr><td colSpan={6} className="text-center py-10 text-brand-n500">Sin inspecciones registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
