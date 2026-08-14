'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { NOMBRE_MODULO } from '@/lib/auth/permisos'
import type { PerfilDirectorio, ModuloTarea } from '@/types'

interface ProyectoOpcion { id: number; ot: string; nombre: string }

interface Props {
  abierto: boolean
  onClose: () => void
  // Si viene seteado (ej. desde el chat de una persona puntual), el
  // destinatario queda fijo y no hace falta el directorio completo.
  destinatarioInicial?: PerfilDirectorio | null
  directorio?: PerfilDirectorio[]
  onCreada?: () => void
}

const MODULOS: ModuloTarea[] = ['pruebas_alimentadores', 'verificacion_ric', 'prevencion_riesgos', 'avance_obra']

// Form compartido para asignar una tarea — lo abren tanto "Nueva tarea" en
// /itinerario (con el directorio completo) como el botón "Asignar tarea"
// del chat (components/mensajeria/HiloConversacion.tsx, con el destinatario
// ya fijo). "modulo" es solo el atajo de navegación del destinatario — no
// crea ni vincula ningún registro real de esos módulos (ver el plan).
export default function NuevaTareaModal({ abierto, onClose, destinatarioInicial = null, directorio = [], onCreada }: Props) {
  const [asignadoA, setAsignadoA] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [modulo, setModulo] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [proyectos, setProyectos] = useState<ProyectoOpcion[]>([])
  const [guardando, setGuardando] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!abierto) return
    setAsignadoA(destinatarioInicial?.id ?? '')
    setTitulo('')
    setDescripcion('')
    setProyectoId('')
    setModulo('')
    setFechaLimite('')
    fetch('/api/proyectos?estado=en_proceso')
      .then(r => r.json())
      .then(data => setProyectos(Array.isArray(data) ? data : []))
      .catch(() => setProyectos([]))
  }, [abierto, destinatarioInicial])

  if (!abierto) return null

  const crear = async () => {
    if (!asignadoA) { showToast('Selecciona a quién asignarla', 'error'); return }
    if (!titulo.trim()) { showToast('Ponle un título a la tarea', 'error'); return }
    setGuardando(true)
    try {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignado_a: asignadoA,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          proyecto_id: proyectoId ? parseInt(proyectoId, 10) : null,
          modulo: modulo || null,
          fecha_limite: fechaLimite || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo asignar la tarea')
      showToast('Tarea asignada', 'success')
      onCreada?.()
      onClose()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#EDEFF2' }}>
          <h2 className="text-sm font-bold text-slate-800">Nueva tarea</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {destinatarioInicial ? (
            <div>
              <span className="label block">Asignar a</span>
              <p className="text-sm font-medium text-slate-800">
                {destinatarioInicial.nombre_completo} <span className="text-brand-n500 font-normal">— {destinatarioInicial.puesto}</span>
              </p>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="tarea-destinatario">Asignar a *</label>
              <select id="tarea-destinatario" className="select w-full" value={asignadoA}
                onChange={e => setAsignadoA(e.target.value)}>
                <option value="">— Selecciona —</option>
                {directorio.map(p => <option key={p.id} value={p.id}>{p.nombre_completo} — {p.puesto}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="tarea-titulo">Título *</label>
            <input id="tarea-titulo" className="input" placeholder="Ej: Verificación RIC en Obra Norte"
              value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tarea-descripcion">Descripción</label>
            <textarea id="tarea-descripcion" className="textarea" rows={3}
              value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tarea-proyecto">Obra</label>
              <select id="tarea-proyecto" className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
                <option value="">— Sin obra —</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tarea-fecha">Fecha límite</label>
              <input id="tarea-fecha" type="date" className="input" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="tarea-modulo">Tipo (atajo para el destinatario)</label>
            <select id="tarea-modulo" className="select w-full" value={modulo} onChange={e => setModulo(e.target.value)}>
              <option value="">— Ninguno —</option>
              {MODULOS.map(m => <option key={m} value={m}>{NOMBRE_MODULO[m]}</option>)}
            </select>
            <p className="text-xs text-brand-n500 mt-1">
              Si eliges un tipo y una obra, el destinatario ve un botón para ir directo a crear ese registro con la obra precargada.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: '#EDEFF2' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={crear} disabled={guardando}>
            {guardando ? 'Asignando…' : 'Asignar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}
