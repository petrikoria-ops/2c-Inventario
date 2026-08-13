'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>[]
  proyectoIdInicial: string
}

export default function NuevaPruebaAlimentadores({ proyectos, proyectoIdInicial }: Props) {
  const [proyectoId, setProyectoId] = useState(proyectoIdInicial)
  const [clienteMandante, setCliente] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaVisita, setFechaVisita] = useState(new Date().toISOString().slice(0, 10))
  const [inspectores, setInspectores] = useState('')
  const [identificacionAlimentador, setIdentificacionAlimentador] = useState('')
  const [instrumento, setInstrumento] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const crear = async () => {
    if (!proyectoId) { showToast('Selecciona una obra', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/pruebas-alimentadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyecto_id: parseInt(proyectoId, 10),
          cliente_mandante: clienteMandante,
          ubicacion,
          fecha_visita: fechaVisita,
          inspectores,
          identificacion_alimentador: identificacionAlimentador,
          instrumento,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el test')
      showToast(`Test ${data.numero} creado`, 'success')
      router.push(`/pruebas-alimentadores/${data.id}`)
    } catch (e: any) {
      showToast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Nuevo Test de Alimentadores</h1>
          <p className="text-sm text-brand-n500">Mediciones entre fases, neutro y tierra de un alimentador</p>
        </div>
        <a href="/pruebas-alimentadores" className="btn btn-ghost btn-sm ml-auto">← Cancelar</a>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="alim-proyecto">Proyecto / Obra *</label>
            <select id="alim-proyecto" className="select w-full" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="alim-cliente">Cliente / Mandante</label>
            <input id="alim-cliente" className="input" value={clienteMandante} onChange={e => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="alim-ubicacion">Ubicación</label>
            <input id="alim-ubicacion" className="input" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="alim-fecha">Fecha de visita</label>
            <input id="alim-fecha" type="date" className="input" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="alim-instrumento">Instrumento de medición</label>
            <input id="alim-instrumento" className="input" placeholder="Ej: Megóhmetro Fluke 1587"
              value={instrumento} onChange={e => setInstrumento(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="alim-identificacion">Identificación del alimentador / tablero</label>
            <input id="alim-identificacion" className="input" placeholder="Ej: Alimentador principal TG-1"
              value={identificacionAlimentador} onChange={e => setIdentificacionAlimentador(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="alim-inspectores">Inspector(es)</label>
            <input id="alim-inspectores" className="input" placeholder="Nombre de quien(es) hacen la visita"
              value={inspectores} onChange={e => setInspectores(e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-4" onClick={crear} disabled={saving}>
        {saving ? 'Creando…' : 'Crear test'}
      </button>
    </div>
  )
}
