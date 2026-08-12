'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

// Página a la que apunta el correo de invitación (ver redirectTo en
// app/api/admin/solicitudes/[id]/aprobar/route.ts). El link de Supabase
// deja al usuario con una sesión temporal (por código PKCE en la URL o por
// tokens en el hash, según la configuración del proyecto) pero SIN
// contraseña propia — esta pantalla es el único lugar donde el usuario
// nuevo la define antes de poder usar el sistema normalmente.
export default function CrearPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalido, setInvalido] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sb = getSupabaseBrowser()

    const establecerSesion = async () => {
      // Formato PKCE: ?code=...
      const query = new URLSearchParams(window.location.search)
      const code = query.get('code')

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Error al intercambiar código de invitación:', error)
          setInvalido(true)
          setReady(true)
          return
        }
      } else {
        // Formato implícito: #access_token=...&refresh_token=...
        const hash = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Error al guardar sesión de invitación:', error)
            setInvalido(true)
            setReady(true)
            return
          }

          // Limpia los tokens de la barra del navegador después de guardarlos.
          window.history.replaceState({}, document.title, '/crear-password')
        }
      }

      const {
        data: { session },
        error: sessionError,
      } = await sb.auth.getSession()

      if (sessionError || !session) {
        console.error('No se encontró sesión de invitación:', sessionError)
        setInvalido(true)
      }

      setReady(true)
    }

    establecerSesion()
  }, [])


  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const sb = getSupabaseBrowser()
    const { error } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('No se pudo guardar la contraseña: ' + error.message)
      return
    }
    router.replace('/')
    router.refresh()
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#2E333A' }} />
      </main>
    )
  }

  if (invalido) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
          <h1 className="text-lg font-bold mb-2" style={{ color: '#2E333A' }}>Enlace no válido o vencido</h1>
          <p className="text-sm text-brand-n500 mb-5">
            Pide al Administrador de software que te reenvíe la invitación desde /admin/solicitudes.
          </p>
          <a href="/login" className="btn btn-outline w-full justify-center">Volver al inicio de sesión</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo-2c.png" alt="2C Montajes" width={48} height={48} priority />
          <h1 className="text-lg font-bold mt-3" style={{ color: '#2E333A' }}>Crea tu contraseña</h1>
          <p className="text-sm text-brand-n500 text-center">Tu solicitud fue aprobada — define una contraseña para entrar al sistema</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="nueva-password">Contraseña</label>
            <input
              id="nueva-password"
              type="password" required autoFocus className="input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmar-password">Confirmar contraseña</label>
            <input
              id="confirmar-password"
              type="password" required className="input"
              value={confirmar} onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-red mt-3 text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-5 justify-center">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar y entrar'}
        </button>
      </form>
    </main>
  )
}
