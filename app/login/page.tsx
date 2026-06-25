'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = getSupabaseBrowser()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }
    router.replace(params.get('next') || '/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo-2c.png" alt="2C Montajes" width={48} height={48} priority />
          <h1 className="text-lg font-bold mt-3" style={{ color: '#2E333A' }}>2C Inventario</h1>
          <p className="text-sm text-slate-500">Inicia sesión para continuar</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email" required autoFocus className="input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@2c.cl"
            />
          </div>
          <div>
            <label className="label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password" required className="input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-red mt-3 text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-5 justify-center">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Entrando…</> : 'Entrar'}
        </button>
        <Link href="/solicitar-acceso" className="block text-center text-xs text-slate-400 mt-4 hover:text-slate-600">
          ¿Eres nuevo en la empresa? Solicita tu acceso
        </Link>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
