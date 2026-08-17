import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import FormularioChecklistDrs from '@/components/checklistDrs/FormularioChecklistDrs'

export const dynamic = 'force-dynamic'

export default async function ChecklistDrsDetallePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseServer()

  const [{ data: checklist }, { data: items }, perfil] = await Promise.all([
    sb.from('checklists_drs').select('*').eq('id', params.id).single(),
    sb.from('checklists_drs_items').select('*').eq('checklist_id', params.id).order('seccion').order('orden'),
    getPerfil(),
  ])

  if (perfil && !puedeVer(perfil, 'checklist_drs')) redirect('/')
  if (!checklist) notFound()

  const editable = !perfil || puedeEditar(perfil, 'checklist_drs')

  return (
    <FormularioChecklistDrs
      checklist={checklist}
      initialItems={items ?? []}
      editable={editable}
    />
  )
}
