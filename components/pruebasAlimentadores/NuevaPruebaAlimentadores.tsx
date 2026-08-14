'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import type { Proyecto } from '@/types'

interface Props {
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre' | 'cliente'>[]
  proyectoIdInicial: string
}

interface AlimentadorBorrador {
  nombre: string
  proteccion_aguas_arriba: string
  largo: string
}

const ALIMENTADOR_VACIO: AlimentadorBorrador = { nombre: '', proteccion_aguas_arriba: '', largo: '' }

export default function NuevaPruebaAlimentadores({ proyectos, proyectoIdInicial }: Props) {
  const [proyectoId, setProyectoId] = useState(proyectoIdInicial)
  const [clienteMandante, setCliente] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaVisita, setFechaVisita] = useState(new Date().toISOString().slice(0, 10))
  const [inspectores, setInspectores] = useState('')
  const [instrumento, setInstrumento] = useState('')
  const [alimentadores, setAlimentadores] = useState<AlimentadorBorrador[]>([{ ...ALIMENTADOR_VACIO }])
  const [cantidadTexto, setCantidadTexto] = useState('1')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  // El input de texto se deja libre mientras se escribe (para poder tipear
  // "12" sin que se resetee en el primer dígito); la lista de alimentadores
  // solo se redimensiona con el valor ya parseado.
  const setCantidad = (texto: string) => {
    setCantidadTexto(texto)
    const cantidad = Math.max(1, Math.min(50, parseInt(texto, 10) || 1))
    setAlimentadores(prev => {
      if (cantidad === prev.length) return prev
      if (cantidad < prev.length) return prev.slice(0, cantidad)
      return [...prev, ...Array.from({ length: cantidad - prev.length }, () => ({ ...ALIMENTADOR_VACIO }))]
    })
  }

  const setCampoAlimentador = (i: number, campo: keyof AlimentadorBorrador, valor: string) => {
    setAlimentadores(prev => prev.map((a, j) => j === i ? { ...a, [campo]: valor } : a))
  }

  const quitarAlimentador = (i: number) => {
    setAlimentadores(prev => {
      if (prev.length <= 1) return prev
      const siguiente = prev.filter((_, j) => j !== i)
      setCantidadTexto(String(siguiente.length))
      return siguiente
    })
  }

  const crear = async () => {
    if (!proyectoId) { showToast('Selecciona una obra', 'error'); return }
    const alimentadoresValidos = alimentadores.filter(a => a.nombre.trim())
    if (!alimentadoresValidos.length) { showToast('Agrega al menos un alimentador con nombre', 'error'); return }
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
          instrumento,
          alimentadores: alimentadoresValidos,
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
          <p className="text-sm text-brand-n500">Mediciones entre fases, neutro y tierra de los alimentadores de una obra</p>
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
            <label className="label" htmlFor="alim-inspectores">Inspector(es)</label>
            <input id="alim-inspectores" className="input" placeholder="Nombre de quien(es) hacen la visita"
              value={inspectores} onChange={e => setInspectores(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Alimentadores a medir</h2></div>
        <div className="p-4">
          <label className="label" htmlFor="alim-cantidad">Cantidad de alimentadores</label>
          <input id="alim-cantidad" type="number" min={1} max={50} className="input w-28"
            value={cantidadTexto} onChange={e => setCantidad(e.target.value)} />
          <p className="text-xs text-brand-n500 mt-1 mb-3">
            Todos los alimentadores de esta obra quedan en el mismo informe. Completa el nombre, la protección aguas arriba y el largo de cada uno.
          </p>

          <div className="space-y-3">
            {alimentadores.map((a, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_auto] gap-2 items-end p-3 rounded-lg" style={{ background: '#F5F6F7', border: '1px solid #E2E4E7' }}>
                <div>
                  <label className="label">Nombre del alimentador {i + 1} *</label>
                  <input className="input" placeholder="Ej: Alimentador TG-1 → TS-3"
                    value={a.nombre} onChange={e => setCampoAlimentador(i, 'nombre', e.target.value)} />
                </div>
                <div>
                  <label className="label">Protección aguas arriba</label>
                  <input className="input" placeholder="Ej: Interruptor termomagnético 100A"
                    value={a.proteccion_aguas_arriba} onChange={e => setCampoAlimentador(i, 'proteccion_aguas_arriba', e.target.value)} />
                </div>
                <div>
                  <label className="label">Largo</label>
                  <input className="input" placeholder="Ej: 45 m"
                    value={a.largo} onChange={e => setCampoAlimentador(i, 'largo', e.target.value)} />
                </div>
                {alimentadores.length > 1 && (
                  <button type="button" className="btn-icon" title="Quitar alimentador" aria-label={`Quitar alimentador ${i + 1}`}
                    onClick={() => quitarAlimentador(i)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-4" onClick={crear} disabled={saving}>
        {saving ? 'Creando…' : 'Crear test'}
      </button>
    </div>
  )
}
