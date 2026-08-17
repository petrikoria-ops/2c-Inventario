'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Plus } from 'lucide-react'
import CompartirEnlaceModal from '@/components/enlacesPublicos/CompartirEnlaceModal'
import BotonEliminarFila from '@/components/ui/BotonEliminarFila'
import type { ChecklistDrs } from '@/types'

export default function TablaChecklistsDrs({ initialData, editable }: { initialData: ChecklistDrs[]; editable: boolean }) {
  const [data, setData] = useState(initialData)

  return (
    <div className="panel">
      <div className="panel-header">
        <ClipboardCheck size={14} style={{ color: 'var(--n-500)' }} />
        <h2>Checklist DRS</h2>
        {editable && (
          <div className="flex gap-2 ml-auto">
            <CompartirEnlaceModal modulo="checklist_drs" registroId={null} label="Enlace en blanco" />
            <Link href="/checklist-drs/nueva" className="btn btn-primary btn-sm">
              <Plus size={13} /> Nuevo checklist
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
              <th className="th">Fecha visita</th>
              <th className="th">Inspectores</th>
              <th className="th">Estado</th>
              {editable && <th className="th w-8" />}
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id} className="tr-hover">
                <td className="td"><Link href={`/checklist-drs/${c.id}`} className="code hover:underline">{c.numero}</Link></td>
                <td className="td">{c.proyecto_nombre ?? '—'}</td>
                <td className="td text-xs text-brand-n500">{new Date(c.fecha_visita).toLocaleDateString('es-CL')}</td>
                <td className="td text-xs text-brand-n500">{c.inspectores ?? '—'}</td>
                <td className="td">
                  <span className={`badge ${c.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
                    {c.estado === 'completa' ? 'Completa' : 'En progreso'}
                  </span>
                </td>
                {editable && (
                  <td className="td">
                    <BotonEliminarFila url={`/api/checklists-drs/${c.id}`}
                      confirmMessage={`¿Eliminar el checklist ${c.numero}? Esta acción no se puede deshacer.`}
                      onDeleted={() => setData(prev => prev.filter(x => x.id !== c.id))} />
                  </td>
                )}
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={6} className="text-center py-10 text-brand-n500">Sin checklists DRS registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
