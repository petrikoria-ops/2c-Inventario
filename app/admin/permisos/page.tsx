import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import PanelPermisosPuesto from '@/components/admin/PanelPermisosPuesto'
import PanelPermisosOverrides from '@/components/admin/PanelPermisosOverrides'
import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Permisos — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function AdminPermisosPage() {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    redirect('/')
  }

  const sb = getSupabaseServer()
  const [{ data: permisosPuesto }, { data: overrides }, { data: usuarios }] = await Promise.all([
    sb.from('permisos_puesto').select('*'),
    sb.from('permisos_usuario_overrides').select('*,perfiles(nombre_completo,email)').order('creado_en', { ascending: false }),
    sb.from('perfiles').select('id,nombre_completo,email').eq('activo', true).order('nombre_completo'),
  ])

  return (
    <div className="p-5 md:p-7 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
          <ShieldCheck size={18} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Permisos</h1>
          <p className="text-sm text-brand-n500">Ver / crear / modificar por puesto, y excepciones por persona</p>
        </div>
      </div>

      <div className="mb-6">
        <PanelPermisosOverrides initialOverrides={overrides ?? []} usuarios={usuarios ?? []} />
      </div>

      <PanelPermisosPuesto initialData={permisosPuesto ?? []} />
    </div>
  )
}
