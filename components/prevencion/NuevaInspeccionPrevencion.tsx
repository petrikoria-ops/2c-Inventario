'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>[]
  prevencionistaInicial: string
}

export default function NuevaInspeccionPrevencion({ proyectos, prevencionistaInicial }: Props) {
  const [proyectoId, setProyectoId] = useState('')
  const [centroTrabajo, setCentroTrabajo] = useState('')
  const [mandante, setMandante] = useState('')
  const [direccion, setDireccion] = useState('')
  const [comuna, setComuna] = useState('')
  const [lugares, setLugares] = useState('')
  const [dirigidoA, setDirigidoA] = useState('')
  const [nTrabajadores, setNTrabajadores] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [prevencionista, setPrevencionista] = useState(prevencionistaInicial)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const crear = async () => {
    if (!centroTrabajo.trim()) { showToast('Indica el centro de trabajo / faena', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/prevencion-riesgos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: proyectoId ? parseInt(proyectoId, 10) : null,
          centro_trabajo: centroTrabajo,
          mandante, direccion, comuna,
          lugares_inspeccionados: lugares,
          dirigido_a: dirigidoA,
          n_trabajadores: nTrabajadores,
          fecha, prevencionista,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear la inspección')
      showToast(`Inspección ${data.numero} creada`, 'success')
      router.push(`/prevencion-riesgos/${data.id}`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nueva inspección de faena</h1>
          <p className="text-sm text-brand-n500">Checklist de verificación DS 594 — condiciones sanitarias y ambientales básicas</p>
        </div>
        <a href="/prevencion-riesgos" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="insp-centro">Nombre faena / centro de trabajo *</label>
            <input id="insp-centro" className="input" value={centroTrabajo} onChange={e => setCentroTrabajo(e.target.value)} placeholder="Ej: Casa Matriz, Obra OT-2026-014…" />
          </div>
          <div>
            <label className="label" htmlFor="insp-proyecto">Obra / proyecto (opcional)</label>
            <select id="insp-proyecto" className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
              <option value="">— Sin vincular a una obra —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="insp-mandante">Empresa mandante</label>
            <input id="insp-mandante" className="input" value={mandante} onChange={e => setMandante(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-direccion">Dirección</label>
            <input id="insp-direccion" className="input" value={direccion} onChange={e => setDireccion(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-comuna">Comuna</label>
            <input id="insp-comuna" className="input" value={comuna} onChange={e => setComuna(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-fecha">Fecha</label>
            <input id="insp-fecha" type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-prevencionista">Prevencionista</label>
            <input id="insp-prevencionista" className="input" value={prevencionista} onChange={e => setPrevencionista(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-trabajadores">N° trabajadores presentes</label>
            <input id="insp-trabajadores" className="input" value={nTrabajadores} onChange={e => setNTrabajadores(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="insp-dirigido">Dirigido a</label>
            <input id="insp-dirigido" className="input" value={dirigidoA} onChange={e => setDirigidoA(e.target.value)} placeholder="Ej: Gerencia 2C Electricidad" />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="insp-lugares">Lugares inspeccionados</label>
            <input id="insp-lugares" className="input" value={lugares} onChange={e => setLugares(e.target.value)} placeholder="Ej: Bodega y oficina" />
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-4" onClick={crear} disabled={saving}>
        {saving ? 'Creando…' : 'Crear inspección y abrir checklist'}
      </button>
    </div>
  )
}
