'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { PUESTOS_POR_DEPARTAMENTO, type Departamento } from '@/lib/auth/permisos'

const NOMBRE_DEPARTAMENTO: Record<Departamento, string> = {
  bodega: 'Bodega', taller: 'Taller', oficina_tecnica: 'Oficina Técnica',
  prevencion: 'Prevención', rrhh: 'Recursos Humanos', directiva: 'Directiva',
  admin_software: 'Administración de software',
}

const DEPARTAMENTOS = Object.keys(PUESTOS_POR_DEPARTAMENTO) as Departamento[]

export default function SolicitarAccesoPage() {
  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [depto, setDepto]     = useState<Departamento | ''>('')
  const [puesto, setPuesto]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [enviado, setEnviado] = useState(false)

  const puestos = depto ? PUESTOS_POR_DEPARTAMENTO[depto] : []

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/solicitudes-enrolamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: nombre, email, departamento_solicitado: depto, puesto_solicitado: puesto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar la solicitud')
      setEnviado(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: '#059669' }} />
          <h1 className="text-lg font-bold mb-2" style={{ color: '#2E333A' }}>Solicitud enviada</h1>
          <p className="text-sm text-slate-500">
            Se notificó al Administrador de software. Cuando apruebe tu solicitud te llegará un correo a <strong>{email}</strong> para crear tu contraseña y entrar al sistema.
          </p>
          <Link href="/login" className="btn btn-outline w-full justify-center mt-5">Volver al inicio de sesión</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F6F7' }}>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo-2c.png" alt="2C Montajes" width={48} height={48} priority />
          <h1 className="text-lg font-bold mt-3" style={{ color: '#2E333A' }}>Solicitar acceso</h1>
          <p className="text-sm text-slate-500 text-center">Pide tu cuenta para 2C — un administrador la revisa y te invita por correo</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="solicitud-nombre">Nombre completo</label>
            <input id="solicitud-nombre" required className="input" value={nombre}
              onChange={e => setNombre(e.target.value)} placeholder="Tu nombre y apellido" />
          </div>
          <div>
            <label className="label" htmlFor="solicitud-email">Email</label>
            <input id="solicitud-email" type="email" required className="input" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="tucorreo@2c.cl" />
          </div>
          <div>
            <label className="label" htmlFor="solicitud-depto">Departamento</label>
            <select id="solicitud-depto" required className="select" value={depto}
              onChange={e => { setDepto(e.target.value as Departamento); setPuesto('') }}>
              <option value="">— Selecciona —</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{NOMBRE_DEPARTAMENTO[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="solicitud-puesto">Puesto</label>
            <select id="solicitud-puesto" required className="select" value={puesto} disabled={!depto}
              onChange={e => setPuesto(e.target.value)}>
              <option value="">{depto ? '— Selecciona —' : 'Elige un departamento primero'}</option>
              {puestos.map(p => <option key={p.puesto} value={p.puesto}>{p.puesto}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-red mt-3 text-sm">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-5 justify-center">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : 'Enviar solicitud'}
        </button>
        <Link href="/login" className="block text-center text-xs text-slate-400 mt-4 hover:text-slate-600">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </form>
    </div>
  )
}
