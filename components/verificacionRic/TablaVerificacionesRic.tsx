'use client'
import Link from 'next/link'
import { ShieldCheck, Plus } from 'lucide-react'
import type { VerificacionRic } from '@/types'

export default function TablaVerificacionesRic({ initialData, editable }: { initialData: VerificacionRic[]; editable: boolean }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <ShieldCheck size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Verificaciones RIC N°18/19</h2>
        {editable && (
          <Link href="/verificacion-ric/nueva" className="btn btn-primary btn-sm ml-auto">
            <Plus size={13} /> Nueva verificación
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">N°</th>
              <th className="th">Obra</th>
              <th className="th">Fecha visita</th>
              <th className="th">Inspectores</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map(v => (
              <tr key={v.id} className="tr-hover">
                <td className="td"><Link href={`/verificacion-ric/${v.id}`} className="code hover:underline">{v.numero}</Link></td>
                <td className="td">{v.proyecto_nombre ?? '—'}</td>
                <td className="td text-xs text-brand-n500">{new Date(v.fecha_visita).toLocaleDateString('es-CL')}</td>
                <td className="td text-xs text-brand-n500">{v.inspectores ?? '—'}</td>
                <td className="td">
                  <span className={`badge ${v.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                    {v.estado === 'completa' ? 'Completa' : 'En progreso'}
                  </span>
                </td>
              </tr>
            ))}
            {!initialData.length && (
              <tr><td colSpan={5} className="text-center py-10 text-brand-n500">Sin verificaciones RIC registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
