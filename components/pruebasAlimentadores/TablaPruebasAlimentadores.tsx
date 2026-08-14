'use client'
import Link from 'next/link'
import { Zap, Plus } from 'lucide-react'
import type { PruebaAlimentadores } from '@/types'

type PruebaConConteo = PruebaAlimentadores & { pruebas_alimentadores_alimentadores?: { count: number }[] }

export default function TablaPruebasAlimentadores({ initialData, editable }: { initialData: PruebaConConteo[]; editable: boolean }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <Zap size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Test de Alimentadores</h2>
        {editable && (
          <Link href="/pruebas-alimentadores/nueva" className="btn btn-primary btn-sm ml-auto">
            <Plus size={13} /> Nuevo test
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">N°</th>
              <th className="th">Obra</th>
              <th className="th">Alimentadores</th>
              <th className="th">Fecha visita</th>
              <th className="th">Inspectores</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map(p => (
              <tr key={p.id} className="tr-hover">
                <td className="td"><Link href={`/pruebas-alimentadores/${p.id}`} className="code hover:underline">{p.numero}</Link></td>
                <td className="td">{p.proyecto_nombre ?? '—'}</td>
                <td className="td text-xs text-brand-n500">{p.pruebas_alimentadores_alimentadores?.[0]?.count ?? 0}</td>
                <td className="td text-xs text-brand-n500">{new Date(p.fecha_visita).toLocaleDateString('es-CL')}</td>
                <td className="td text-xs text-brand-n500">{p.inspectores ?? '—'}</td>
                <td className="td">
                  <span className={`badge ${p.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                    {p.estado === 'completa' ? 'Completa' : 'En progreso'}
                  </span>
                </td>
              </tr>
            ))}
            {!initialData.length && (
              <tr><td colSpan={6} className="text-center py-10 text-brand-n500">Sin tests de alimentadores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
