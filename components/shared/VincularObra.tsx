'use client'
// Vincula un registro (Verificación RIC, Checklist DRS, Prevención,
// Alimentadores) a una obra real del sistema — típico en registros creados
// por un enlace público "en blanco", donde la obra llegó como texto libre
// (proyecto_nombre / centro_trabajo) sin corresponder a ningún proyecto
// real. No es exclusivo de ese caso: también sirve para corregir/actualizar
// el vínculo de cualquier registro.
import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface Proyecto { id: number; ot: string; nombre: string }

interface Props {
  proyectoId: number | null
  patchUrl: string
  onVinculado: (proyectoId: number, proyectoNombre: string | null) => void
}

export default function VincularObra({ proyectoId, patchUrl, onVinculado }: Props) {
  const [editando, setEditando] = useState(false)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const { showToast } = useToast()

  const abrir = async () => {
    setEditando(true)
    if (proyectos.length) return
    setCargando(true)
    try {
      const res = await fetch('/api/proyectos')
      const data = await res.json()
      setProyectos(Array.isArray(data) ? data : [])
    } finally {
      setCargando(false)
    }
  }

  const vincular = async (idTexto: string) => {
    if (!idTexto) return
    const id = parseInt(idTexto, 10)
    setGuardando(true)
    try {
      const res = await fetch(patchUrl, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proyecto_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo vincular la obra')
      onVinculado(id, data.proyecto_nombre ?? proyectos.find(p => p.id === id)?.nombre ?? null)
      setEditando(false)
      showToast('Obra vinculada', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (!editando) {
    return (
      <div className="flex items-center gap-2 text-xs mt-1">
        {!proyectoId && <span className="badge badge-yellow">Obra sin vincular a un proyecto real</span>}
        <button type="button" className="flex items-center gap-1 hover:underline" style={{ color: 'var(--n-500)' }} onClick={abrir}>
          <Link2 size={11} /> {proyectoId ? 'Cambiar obra vinculada' : 'Vincular a una obra real'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <select className="select text-sm" disabled={cargando || guardando} defaultValue=""
        onChange={e => vincular(e.target.value)}>
        <option value="">{cargando ? 'Cargando obras…' : '— Selecciona una obra —'}</option>
        {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
      </select>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
    </div>
  )
}
