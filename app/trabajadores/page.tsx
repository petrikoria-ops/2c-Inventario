import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import TablaTrabjadores from '@/components/trabajadores/TablaTrabjadores'
import { getPerfil, puedeVer, puedeEditar } from '@/lib/auth/permisos.server'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Trabajadores | 2C Inventario' }

export default async function TrabajadoresPage() {
  const perfil = await getPerfil()
  if (!perfil || !puedeVer(perfil, 'trabajadores')) redirect('/')

  const sb = getSupabaseServer()
  const { data } = await sb.from('trabajadores').select('*').eq('activo', true).order('nombre')
  const editable = puedeEditar(perfil, 'trabajadores')
  return (
    <div className="p-5 w-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#2E333A' }}>Trabajadores</h1>
        <p className="text-sm text-brand-n500">Registro de personal para asignación de herramientas</p>
      </div>
      <TablaTrabjadores initialData={data ?? []} editable={editable} />
    </div>
  )
}
