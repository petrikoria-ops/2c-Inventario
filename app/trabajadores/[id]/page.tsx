import { getSupabaseServer } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getPerfil, puedeVer, puedeCrear } from '@/lib/auth/permisos.server'
import { GRUPOS_DOCUMENTOS, type CategoriaDocumentoTrabajador } from '@/lib/departamentos/documentosTrabajador'
import TrabajadorDetalle from '@/components/trabajadores/TrabajadorDetalle'
import type { DocumentoTrabajador } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TrabajadorPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: trabajador }, { data: proyectos }, documentosRes, perfil] = await Promise.all([
    sb.from('trabajadores').select('*').eq('id', params.id).single(),
    sb.from('proyectos').select('id,ot,nombre').in('estado', ['en_proceso', 'presupuesto']).order('creado_en', { ascending: false }),
    sb.from('documentos_trabajador').select('*, proyectos(id,ot,nombre)').eq('trabajador_id', params.id).order('creado_en', { ascending: false }),
    getPerfil(),
  ])

  // Acceso a la ficha si puede ver CUALQUIERA de los dos grupos de
  // documentos (trabajadores para RRHH, prevencion_riesgos para
  // Prevención) — no solo 'trabajadores', porque Prevención llega acá
  // únicamente para gestionar sus propios documentos.
  const puedeEntrar = !perfil || GRUPOS_DOCUMENTOS.some(g => puedeVer(perfil, g.modulo))
  if (!puedeEntrar) redirect('/')
  if (!trabajador) notFound()

  // Si migration_documentos_trabajador.sql todavía no corrió, la tabla no
  // existe y esto vuelve con error — se trata como "sin documentos" en
  // vez de romper la ficha del trabajador.
  const documentos = (documentosRes.error ? [] : (documentosRes.data ?? [])) as DocumentoTrabajador[]

  const grupos = GRUPOS_DOCUMENTOS
    .filter(g => !perfil || puedeVer(perfil, g.modulo))
    .map(grupo => ({
      grupo,
      data: documentos.filter(d => grupo.categorias.some(c => c.value === (d.categoria as CategoriaDocumentoTrabajador))),
      editable: !perfil || puedeCrear(perfil, grupo.modulo),
    }))

  return <TrabajadorDetalle trabajador={trabajador} proyectos={proyectos ?? []} grupos={grupos} />
}
