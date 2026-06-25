'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock3, LogOut } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export default function PendienteAprobacionPage() {
  const router = useRouter()

  const cerrarSesion = async () => {
    await getSupabaseBrowser().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-4">
          <Image src="/logo-2c.png" alt="2C Montajes" width={48} height={48} priority />
          <div className="w-12 h-12 rounded-full flex items-center justify-center mt-4 mb-2" style={{ background: '#FFF4D6' }}>
            <Clock3 size={22} style={{ color: '#C9A000' }} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: '#2E333A' }}>Tu cuenta está pendiente de aprobación</h1>
          <p className="text-sm text-slate-500 mt-2">
            Tu acceso todavía no tiene un departamento ni un rol asignado. El Administrador de software fue notificado de tu solicitud — escríbele directamente si necesitas que la revisen con urgencia.
          </p>
        </div>
        <button onClick={cerrarSesion} className="btn btn-outline w-full justify-center mt-4">
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
