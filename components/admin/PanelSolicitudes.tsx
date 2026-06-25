'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ShieldAlert } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { fechaHora } from '@/lib/utils'
import { PUESTOS_POR_DEPARTAMENTO, type NivelAcceso, type Departamento } from '@/lib/auth/permisos'
import type { SolicitudEnrolamiento } from '@/types'

function nivelSugerido(departamento: string, puesto: string): NivelAcceso {
  const lista = PUESTOS_POR_DEPARTAMENTO[departamento as Departamento] ?? []
  return lista.find(p => p.puesto === puesto)?.nivel ?? 'visualizacion'
}

export default function PanelSolicitudes({ initialData }: { initialData: SolicitudEnrolamiento[] }) {
  const [solicitudes, setSolicitudes] = useState(initialData)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [codigo, setCodigo] = useState('')
  const [nivel, setNivel] = useState<NivelAcceso>('visualizacion')
  const [procesando, setProcesando] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const abrir = (s: SolicitudEnrolamiento) => {
    setAbierta(s.id)
    setCodigo('')
    setNivel(nivelSugerido(s.departamento_solicitado, s.puesto_solicitado))
  }

  const resolver = async (s: SolicitudEnrolamiento, accion: 'aprobar' | 'rechazar') => {
    if (accion === 'aprobar' && codigo.trim() !== s.codigo_verificacion) {
      showToast('El código no coincide con el del correo enviado al solicitante.', 'error')
      return
    }
    setProcesando(true)
    try {
      const res = await fetch(`/api/admin/solicitudes/${s.id}/${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, nivel_acceso: nivel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo procesar la solicitud')
      setSolicitudes(prev => prev.map(x => x.id === s.id ? { ...x, estado: accion === 'aprobar' ? 'aprobada' : 'rechazada' } : x))
      setAbierta(null)
      showToast(accion === 'aprobar' ? `Se invitó a ${s.email}` : 'Solicitud rechazada', 'success')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setProcesando(false)
    }
  }

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente')
  const resueltas   = solicitudes.filter(s => s.estado !== 'pendiente')

  return (
    <div className="panel">
      <div className="panel-header"><h2>Solicitudes pendientes</h2><span className="badge badge-yellow">{pendientes.length}</span></div>
      {pendientes.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">No hay solicitudes pendientes.</div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
          {pendientes.map(s => (
            <div key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-sm text-slate-800">{s.nombre_completo} <span className="text-slate-400 font-normal">— {s.email}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.departamento_solicitado} · {s.puesto_solicitado} · {fechaHora(s.creado_en)}</div>
                </div>
                {abierta !== s.id && (
                  <button className="btn btn-primary btn-sm" onClick={() => abrir(s)}>Revisar</button>
                )}
              </div>

              {abierta === s.id && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: '#FAFBFC', border: '1px solid #E8EAED' }}>
                  <div className="flex items-start gap-2 text-xs mb-3" style={{ color: '#8A6400' }}>
                    <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />
                    Se envió un código de verificación a tu correo de administrador — ingrésalo aquí para confirmar que esta solicitud es legítima antes de aprobarla.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label" htmlFor={`codigo-${s.id}`}>Código de verificación</label>
                      <input id={`codigo-${s.id}`} className="input" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="6 dígitos" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`nivel-${s.id}`}>Nivel de acceso a asignar</label>
                      <select id={`nivel-${s.id}`} className="select" value={nivel} onChange={e => setNivel(e.target.value as NivelAcceso)}>
                        <option value="visualizacion">Visualización (solo lectura)</option>
                        <option value="operador">Operador</option>
                        <option value="encargado">Encargado</option>
                        <option value="jefe_departamento">Jefe de departamento</option>
                        <option value="directiva">Directiva</option>
                        <option value="admin_software">Administrador de software</option>
                        <option value="master">Master (acceso total)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={procesando} className="btn btn-success btn-sm" onClick={() => resolver(s, 'aprobar')}>
                      <Check size={13} /> Aprobar e invitar
                    </button>
                    <button disabled={procesando} className="btn btn-danger btn-sm" onClick={() => resolver(s, 'rechazar')}>
                      <X size={13} /> Rechazar
                    </button>
                    <button disabled={procesando} className="btn btn-ghost btn-sm ml-auto" onClick={() => setAbierta(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {resueltas.length > 0 && (
        <>
          <div className="panel-header" style={{ borderTop: '1px solid #ECEEF1' }}><h2>Historial</h2></div>
          <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
            {resueltas.map(s => (
              <div key={s.id} className="p-3 flex items-center justify-between text-sm">
                <span>{s.nombre_completo} <span className="text-slate-400">— {s.email}</span></span>
                <span className={`badge ${s.estado === 'aprobada' ? 'badge-green' : 'badge-red'}`}>{s.estado}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
