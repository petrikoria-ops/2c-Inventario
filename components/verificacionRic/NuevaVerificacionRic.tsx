'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>[]
  proyectoIdInicial: string
}

export default function NuevaVerificacionRic({ proyectos, proyectoIdInicial }: Props) {
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
      const res = await fetch('/api/verificacion-ric', {
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
      if (!res.ok) throw new Error(data.error ?? 'Error al crear la verificación')
      showToast(`Verificación ${data.numero} creada`, 'success')
      router.push(`/verificacion-ric/${data.id}`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nueva verificación RIC N°18/19</h1>
          <p className="text-sm text-brand-n500">Verificación inicial y puesta en marcha de la instalación</p>
        </div>
        <a href="/verificacion-ric" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="ric-proyecto">Proyecto / Obra *</label>
            <select id="ric-proyecto" className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ric-cliente">Cliente / Mandante</label>
            <input id="ric-cliente" className="input" value={clienteMandante} onChange={e => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ric-ubicacion">Ubicación</label>
            <input id="ric-ubicacion" className="input" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ric-fecha">Fecha de visita</label>
            <input id="ric-fecha" type="date" className="input" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ric-tableros">N° de tableros del proyecto</label>
            <input id="ric-tableros" type="number" min="0" className="input" value={numTableros} onChange={e => setNumTableros(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="ric-inspectores">Inspector(es)</label>
            <input id="ric-inspectores" className="input" placeholder="Nombre de quien(es) hacen la visita"
              value={inspectores} onChange={e => setInspectores(e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-4" onClick={crear} disabled={saving}>
        {saving ? 'Creando…' : 'Crear verificación'}
      </button>
    </div>
  )
}
