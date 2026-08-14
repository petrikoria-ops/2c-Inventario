import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import DocumentosGrupo from './DocumentosGrupo'
import type { GrupoDocumentos } from '@/lib/departamentos/documentosTrabajador'
import type { Trabajador, DocumentoTrabajador, Proyecto } from '@/types'

interface GrupoVisible {
  grupo: GrupoDocumentos
  data: DocumentoTrabajador[]
  editable: boolean
}

interface Props {
  trabajador: Trabajador
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]
  grupos: GrupoVisible[]
}

export default function TrabajadorDetalle({ trabajador, proyectos, grupos }: Props) {
  return (
    <div className="p-5 w-full max-w-3xl mx-auto">
      <Link href="/trabajadores" className="flex items-center gap-1 text-sm text-brand-n500 hover:text-slate-700 transition-colors mb-4 w-fit">
        <ArrowLeft size={14} /> Trabajadores
      </Link>

      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
          <User size={18} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">{trabajador.nombre}</h1>
          <p className="text-xs text-brand-n500">
            {trabajador.cargo ?? 'Sin cargo'}{trabajador.rut ? ` · ${trabajador.rut}` : ''}{trabajador.telefono ? ` · ${trabajador.telefono}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {grupos.map(({ grupo, data, editable }) => (
          <DocumentosGrupo key={grupo.modulo} grupo={grupo} trabajadorId={trabajador.id}
            proyectos={proyectos} initialData={data} editable={editable} />
        ))}
        {grupos.length === 0 && (
          <div className="panel py-10 text-center text-sm text-brand-n500">
            Tu perfil no tiene acceso a los documentos de este trabajador.
          </div>
        )}
      </div>
    </div>
  )
}
