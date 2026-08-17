'use client'
// Pantalla inicial de un enlace "en blanco" — la persona externa completa
// los datos generales (obra, cliente, ubicación, etc.) para crear el
// registro desde cero. Una vez creado, se cambia localmente a
// FormularioPublico (sin recargar la página) para seguir llenando el
// checklist y firmar, igual que un enlace que ya apuntaba a un registro.
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import FormularioPublico from './FormularioPublico'
import type { ModuloPublico } from '@/types'

type Registro = Record<string, any>

interface Props {
  token: string
  modulo: ModuloPublico
}

const TITULOS: Record<ModuloPublico, string> = {
  verificacion_ric: 'Nueva Verificación RIC N°18/19',
  checklist_drs: 'Nuevo Checklist DRS',
  prevencion_riesgos: 'Nueva inspección de prevención de riesgos',
  pruebas_alimentadores: 'Nuevo Test de Alimentadores',
}

interface AlimentadorBorrador { nombre: string; proteccion_aguas_arriba: string; largo: string }

export default function CrearRegistroPublico({ token, modulo }: Props) {
  const [creado, setCreado] = useState<Registro | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const [obra, setObra] = useState('')
  const [clienteMandante, setClienteMandante] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [inspectores, setInspectores] = useState('')
  const [instrumento, setInstrumento] = useState('')
  const [incluyeSeccionA, setIncluyeSeccionA] = useState(true)
  const [incluyeAnexoSat, setIncluyeAnexoSat] = useState(false)

  const [centroTrabajo, setCentroTrabajo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [comuna, setComuna] = useState('')
  const [mandante, setMandante] = useState('')
  const [prevencionista, setPrevencionista] = useState('')

  const [alimentadores, setAlimentadores] = useState<AlimentadorBorrador[]>([{ nombre: '', proteccion_aguas_arriba: '', largo: '' }])

  const setCampoAlimentador = (i: number, campo: keyof AlimentadorBorrador, valor: string) => {
    setAlimentadores(prev => prev.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)))
  }

  const crear = async () => {
    setError('')
    if (modulo === 'prevencion_riesgos' && !centroTrabajo.trim()) { setError('Ingresa el centro de trabajo / faena.'); return }
    if (modulo !== 'prevencion_riesgos' && !obra.trim()) { setError('Ingresa el nombre de la obra.'); return }
    if (modulo === 'verificacion_ric' && !incluyeSeccionA && !incluyeAnexoSat) { setError('Selecciona al menos un alcance.'); return }
    const alimentadoresValidos = alimentadores.filter(a => a.nombre.trim())
    if (modulo === 'pruebas_alimentadores' && !alimentadoresValidos.length) { setError('Agrega al menos un alimentador con nombre.'); return }

    setCreando(true)
    try {
      const body: Registro = { obra, cliente_mandante: clienteMandante, ubicacion, fecha_visita: fecha, inspectores }
      if (modulo === 'verificacion_ric') {
        body.incluye_seccion_a = incluyeSeccionA
        body.incluye_anexo_sat = incluyeAnexoSat
      }
      if (modulo === 'pruebas_alimentadores') {
        body.instrumento = instrumento
        body.alimentadores = alimentadoresValidos
      }
      if (modulo === 'prevencion_riesgos') {
        body.centro_trabajo = centroTrabajo
        body.direccion = direccion
        body.comuna = comuna
        body.mandante = mandante
        body.fecha = fecha
        body.prevencionista = prevencionista
      }
      const res = await fetch(`/api/publico/${token}/crear`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear.')
      setCreado(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreando(false)
    }
  }

  if (creado) {
    return (
      <FormularioPublico
        token={token}
        modulo={modulo}
        cabeceraInicial={creado.cabecera}
        itemsIniciales={creado.items}
        alimentadoresIniciales={creado.alimentadores}
        tablerosIniciales={creado.tableros}
        fotosFirmadas={{}}
        yaCompletado={false}
        completadoPorNombre={null}
        completadoPorRut={null}
      />
    )
  }

  return (
    <div className="p-5 w-full max-w-3xl mx-auto pb-16" style={{ background: '#F5F6F7', minHeight: '100vh' }}>
      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-800">{TITULOS[modulo]}</h1>
        <p className="text-sm text-brand-n500">Completa los datos generales para empezar.</p>
      </div>

      {error && <div className="alert alert-red mb-4 text-sm">{error}</div>}

      <div className="panel">
        <div className="panel-header"><h2>Datos generales</h2></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {modulo === 'prevencion_riesgos' ? (
            <>
              <div className="col-span-2">
                <label className="label">Centro de trabajo / faena *</label>
                <input className="input" value={centroTrabajo} onChange={e => setCentroTrabajo(e.target.value)} />
              </div>
              <div><label className="label">Dirección</label><input className="input" value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
              <div><label className="label">Comuna</label><input className="input" value={comuna} onChange={e => setComuna(e.target.value)} /></div>
              <div><label className="label">Mandante</label><input className="input" value={mandante} onChange={e => setMandante(e.target.value)} /></div>
              <div><label className="label">Fecha</label><input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Prevencionista</label><input className="input" value={prevencionista} onChange={e => setPrevencionista(e.target.value)} /></div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <label className="label">Obra *</label>
                <input className="input" placeholder="Nombre de la obra / proyecto" value={obra} onChange={e => setObra(e.target.value)} />
              </div>
              <div><label className="label">Cliente / Mandante</label><input className="input" value={clienteMandante} onChange={e => setClienteMandante(e.target.value)} /></div>
              <div><label className="label">Ubicación</label><input className="input" value={ubicacion} onChange={e => setUbicacion(e.target.value)} /></div>
              <div><label className="label">Fecha de visita</label><input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
              {modulo === 'pruebas_alimentadores' && (
                <div><label className="label">Instrumento de medición</label><input className="input" value={instrumento} onChange={e => setInstrumento(e.target.value)} /></div>
              )}
              <div className="col-span-2"><label className="label">Inspector(es)</label><input className="input" value={inspectores} onChange={e => setInspectores(e.target.value)} /></div>
            </>
          )}
        </div>
      </div>

      {modulo === 'verificacion_ric' && (
        <div className="panel">
          <div className="panel-header"><h2>Alcance</h2></div>
          <div className="p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={incluyeSeccionA} onChange={e => setIncluyeSeccionA(e.target.checked)} />
              Sección A — checklist de verificación inicial RIC N°18/19
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={incluyeAnexoSat} onChange={e => setIncluyeAnexoSat(e.target.checked)} />
              Anexo Opcional SAT — checklist por tablero
            </label>
          </div>
        </div>
      )}

      {modulo === 'pruebas_alimentadores' && (
        <div className="panel">
          <div className="panel-header"><h2>Alimentadores a medir</h2></div>
          <div className="p-4 space-y-3">
            {alimentadores.map((a, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_auto] gap-2 items-end p-3 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E2E4E7' }}>
                <div>
                  <label className="label">Nombre del alimentador {i + 1} *</label>
                  <input className="input" placeholder="Ej: Alimentador TG-1 → TS-3" value={a.nombre}
                    onChange={e => setCampoAlimentador(i, 'nombre', e.target.value)} />
                </div>
                <div>
                  <label className="label">Protección aguas arriba</label>
                  <input className="input" value={a.proteccion_aguas_arriba} onChange={e => setCampoAlimentador(i, 'proteccion_aguas_arriba', e.target.value)} />
                </div>
                <div>
                  <label className="label">Largo</label>
                  <input className="input" value={a.largo} onChange={e => setCampoAlimentador(i, 'largo', e.target.value)} />
                </div>
                {alimentadores.length > 1 && (
                  <button type="button" className="btn-icon" title="Quitar alimentador" aria-label={`Quitar alimentador ${i + 1}`}
                    onClick={() => setAlimentadores(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm"
              onClick={() => setAlimentadores(prev => [...prev, { nombre: '', proteccion_aguas_arriba: '', largo: '' }])}>
              <Plus size={13} /> Agregar alimentador
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-primary w-full justify-center mt-4" onClick={crear} disabled={creando}>
        {creando ? 'Creando…' : 'Crear y continuar'}
      </button>
    </div>
  )
}
