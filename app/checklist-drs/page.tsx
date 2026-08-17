import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'
import TablaChecklistsDrs from '@/components/checklistDrs/TablaChecklistsDrs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Checklist DRS — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ChecklistDrsPage() {
  const sb = getSupabaseServer()
  const [{ data }, perfil] = await Promise.all([
    sb.from('checklists_drs').select('*').order('fecha_visita', { ascending: false }),
    getPerfil(),
  ])
  if (perfil && !puedeVer(perfil, 'checklist_drs')) redirect('/')
  const editable = !perfil || puedeEditar(perfil, 'checklist_drs')

  return (
    <div className="p-5 w-full">
      <TablaChecklistsDrs initialData={data ?? []} editable={editable} />
    </div>
  )
}
