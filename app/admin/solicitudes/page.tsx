import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import PanelSolicitudes from '@/components/admin/PanelSolicitudes'
import PanelUsuarios from '@/components/admin/PanelUsuarios'
import { UserCog } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Gestión de usuarios — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function SolicitudesAdminPage() {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    redirect('/')
  }

  const sb = getSupabaseServer()
  const [{ data: solicitudes }, { data: usuarios }] = await Promise.all([
    sb.from('solicitudes_enrolamiento').select('*').order('creado_en', { ascending: false }),
    sb.from('perfiles').select('*').order('nombre_completo'),
  ])

  return (
    <div className="p-5 md:p-7 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
          <UserCog size={18} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestión de usuarios</h1>
          <p className="text-sm text-slate-500">Solicitudes de acceso, roles y cuentas activas</p>
        </div>
      </div>
      <div className="mb-6">
        <PanelSolicitudes initialData={solicitudes ?? []} />
      </div>
      <PanelUsuarios initialData={usuarios ?? []} miId={perfil.id} />
    </div>
  )
}
