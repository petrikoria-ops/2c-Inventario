import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/auth/permisos.server'
import PanelErrores from '@/components/admin/PanelErrores'
import { AlertOctagon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log de errores — 2C Inventario' }
export const dynamic = 'force-dynamic'

export default async function ErroresAdminPage() {
  const perfil = await getPerfil()
  if (!perfil || (perfil.nivel_acceso !== 'admin_software' && perfil.nivel_acceso !== 'master')) {
    redirect('/')
  }

  const sb = getSupabaseServer()
  const { data: errores } = await sb
    .from('error_log')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(200)

  return (
    <div className="p-5 md:p-7 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border" style={{ borderColor: '#E8EAED' }}>
          <AlertOctagon size={18} style={{ color: '#2E333A' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Log de errores</h1>
          <p className="text-sm text-slate-500">Excepciones reportadas por la aplicación (últimas 200)</p>
        </div>
      </div>
      <PanelErrores initialData={errores ?? []} />
    </div>
  )
}
