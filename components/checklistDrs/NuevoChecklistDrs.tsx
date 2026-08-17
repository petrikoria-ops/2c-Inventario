'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>[]
  proyectoIdInicial: string
}

export default function NuevoChecklistDrs({ proyectos, proyectoIdInicial }: Props) {
  const [proyectoId, setProyectoId] = useState(proyectoIdInicial)
  const [clienteMandante, setCliente] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaVisita, setFechaVisita] = useState(new Date().toISOString().slice(0, 10))
  const [inspectores, setInspectores] = useState('')
  const [numTableros, setNumTableros] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const crear = async () => {
    if (!proyectoId) { showToast('Selecciona una obra', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/checklists-drs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: parseInt(proyectoId, 10),
          cliente_mandante: clienteMandante,
          ubicacion,
          fecha_visita: fechaVisita,
          inspectores,
          num_tableros: numTableros,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el checklist')
      showToast(`Checklist ${data.numero} creado`, 'success')
      router.push(`/checklist-drs/${data.id}`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nuevo checklist DRS</h1>
          <p className="text-sm text-brand-n500">Protocolo de pruebas de verificación inicial e informe de imágenes</p>
        </div>
        <a href="/checklist-drs" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="drs-proyecto">Proyecto / Obra *</label>
            <select id="drs-proyecto" className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="drs-cliente">Cliente / Mandante</label>
            <input id="drs-cliente" className="input" value={clienteMandante} onChange={e => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="drs-ubicacion">Ubicación</label>
            <input id="drs-ubicacion" className="input" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="drs-fecha">Fecha de visita</label>
            <input id="drs-fecha" type="date" className="input" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="drs-tableros">N° de tableros del proyecto</label>
            <input id="drs-tableros" type="number" min="0" className="input" value={numTableros} onChange={e => setNumTableros(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="drs-inspectores">Inspector(es)</label>
            <input id="drs-inspectores" className="input" placeholder="Nombre de quien(es) hacen la visita"
              value={inspectores} onChange={e => setInspectores(e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-4" onClick={crear} disabled={saving}>
        {saving ? 'Creando…' : 'Crear checklist'}
      </button>
    </div>
  )
}
