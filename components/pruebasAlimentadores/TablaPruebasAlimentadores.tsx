'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Zap, Plus } from 'lucide-react'
import CompartirEnlaceModal from '@/components/enlacesPublicos/CompartirEnlaceModal'
import BotonEliminarFila from '@/components/ui/BotonEliminarFila'
import type { PruebaAlimentadores } from '@/types'

type PruebaConConteo = PruebaAlimentadores & { pruebas_alimentadores_alimentadores?: { count: number }[] }

export default function TablaPruebasAlimentadores({ initialData, editable }: { initialData: PruebaConConteo[]; editable: boolean }) {
  const [data, setData] = useState(initialData)

  return (
    <div className="panel">
      <div className="panel-header">
        <Zap size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Test de Alimentadores</h2>
        {editable && (
          <div className="flex gap-2 ml-auto">
            <CompartirEnlaceModal modulo="pruebas_alimentadores" registroId={null} label="Enlace en blanco" />
            <Link href="/pruebas-alimentadores/nueva" className="btn btn-primary btn-sm">
              <Plus size={13} /> Nuevo test
            </Link>
          </div>
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
              {editable && <th className="th w-8" />}
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
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
                {editable && (
                  <td className="td">
                    <BotonEliminarFila url={`/api/pruebas-alimentadores/${p.id}`}
                      confirmMessage={`¿Eliminar el test ${p.numero}? Esta acción no se puede deshacer.`}
                      onDeleted={() => setData(prev => prev.filter(x => x.id !== p.id))} />
                  </td>
                )}
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={7} className="text-center py-10 text-brand-n500">Sin tests de alimentadores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
