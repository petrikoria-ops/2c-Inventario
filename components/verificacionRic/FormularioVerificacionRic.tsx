'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Printer } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { BLOQUES_RIC, A0_COORDINACION, A0_INFORMES_PROPIOS_TERRENO } from '@/lib/verificacionRic/plantilla'
import ResultadoPills from './ResultadoPills'
import FotoUpload from './FotoUpload'
import type { VerificacionRic, VerificacionRicItem } from '@/types'

interface Props {
  verificacion: VerificacionRic
  initialItems: VerificacionRicItem[]
  editable: boolean
}

export default function FormularioVerificacionRic({ verificacion, initialItems, editable }: Props) {
  const [items, setItems] = useState(initialItems)
  const [cabecera, setCabecera] = useState(verificacion)
  const [guardando, setGuardando] = useState<number | null>(null)
  const notasTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const { showToast } = useToast()
  const router = useRouter()

  const patchItem = useCallback(async (itemId: number, patch: Partial<VerificacionRicItem>) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i))
    const res = await fetch(`/api/verificacion-ric/${verificacion.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [verificacion.id, showToast])

  const patchNotas = useCallback((itemId: number, notas: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, notas } : i))
    clearTimeout(notasTimers.current[itemId])
    notasTimers.current[itemId] = setTimeout(() => {
      setGuardando(itemId)
      fetch(`/api/verificacion-ric/${verificacion.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas }),
      }).finally(() => setGuardando(null))
    }, 600)
  }, [verificacion.id])

  const patchCabecera = useCallback(async (patch: Partial<VerificacionRic>) => {
    setCabecera(prev => ({ ...prev, ...patch }))
    const res = await fetch(`/api/verificacion-ric/${verificacion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast('No se pudo guardar el cambio', 'error')
  }, [verificacion.id, showToast])

  const marcarCompleta = async () => {
    await patchCabecera({ estado: 'completa' })
    showToast('Verificación marcada como completa', 'success')
    router.refresh()
  }

  const porBloque = (bloqueId: string) => items.filter(i => i.bloque === bloqueId).sort((a, b) => a.orden - b.orden)
  const totalItems = items.filter(i => i.tipo === 'verificacion').length
  const resueltos = items.filter(i => i.tipo === 'verificacion' && i.resultado).length

  return (
    <div className="p-5 w-full max-w-4xl mx-auto">
      {/* Cabecera de pantalla */}
      <div className="flex items-start justify-between mb-5 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="code">{cabecera.numero}</span>
            <span className={`badge ${cabecera.estado === 'completa' ? 'badge-green' : 'badge-yellow'}`}>
              {cabecera.estado === 'completa' ? 'Completa' : 'En progreso'}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-800">Verificación RIC N°18/19 — Sección A</h1>
          <p className="text-sm text-brand-n500">{cabecera.proyecto_nombre} · {resueltos}/{totalItems} ítems resueltos</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/verificacion-ric/${verificacion.id}/imprimir`} className="btn btn-outline btn-sm">
            <Printer size={13} /> Ver / Imprimir
          </Link>
          {editable && cabecera.estado !== 'completa' && (
            <button className="btn btn-primary btn-sm" onClick={marcarCompleta}>
              <CheckCircle2 size={13} /> Marcar como completa
            </button>
          )}
        </div>
      </div>

      {/* Portada */}
      <div className="panel">
        <div className="panel-header"><h2>Portada</h2></div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><span className="label block">Cliente/Mandante</span>{cabecera.cliente_mandante ?? '—'}</div>
          <div><span className="label block">Ubicación</span>{cabecera.ubicacion ?? '—'}</div>
          <div><span className="label block">Fecha de visita</span>{new Date(cabecera.fecha_visita).toLocaleDateString('es-CL')}</div>
          <div><span className="label block">Inspector(es)</span>{cabecera.inspectores ?? '—'}</div>
          <div><span className="label block">N° de tableros</span>{cabecera.num_tableros ?? '—'}</div>
        </div>
      </div>

      {/* Bloques A.0 - A.11 */}
      {BLOQUES_RIC.filter(b => b.id !== 'CIERRE').map(b => (
        <div key={b.id} className="panel">
          <div className="panel-header">
            <h2>{b.id} {b.refNormativa && <span className="text-brand-n500 font-normal">— {b.refNormativa}</span>}: {b.titulo}</h2>
          </div>

          {b.id === 'A.0' && (
            <div className="px-4 pt-4 text-xs text-brand-n500 space-y-3 border-b pb-4" style={{ borderColor: '#EDEFF2' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead><tr><th className="text-left pb-1">Oficina Técnica prepara</th><th className="text-left pb-1">Obra / Terreno debe proporcionar</th></tr></thead>
                  <tbody>
                    {A0_COORDINACION.map((row, i) => (
                      <tr key={i} className="align-top"><td className="pr-3 py-1">{row.oficinaTecnica}</td><td className="py-1">{row.terreno}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>{A0_INFORMES_PROPIOS_TERRENO}</p>
            </div>
          )}

          {/* Verificación (3 estados) */}
          {porBloque(b.id).filter(i => i.tipo === 'verificacion').length > 0 && (
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {porBloque(b.id).filter(i => i.tipo === 'verificacion').map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
                  <ResultadoPills value={item.resultado} disabled={!editable}
                    onChange={r => patchItem(item.id, { resultado: r })} />
                </div>
              ))}
            </div>
          )}

          {/* Registro fotográfico / confirmaciones */}
          {porBloque(b.id).filter(i => i.tipo === 'foto').length > 0 && (
            <div className="divide-y border-t" style={{ borderColor: '#EDEFF2' }}>
              {porBloque(b.id).filter(i => i.tipo === 'foto').map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input type="checkbox" checked={item.foto_tomada} disabled={!editable}
                    onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })}
                    className="cursor-pointer" aria-label={item.texto} />
                  <span className="flex-1 text-sm text-slate-600">{item.texto}</span>
                  <FotoUpload
                    verificacionId={verificacion.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                    onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                    onRemoved={() => patchItem(item.id, { foto_url: null })}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Notas del bloque */}
          {porBloque(b.id).filter(i => i.tipo === 'nota').map(item => (
            <div key={item.id} className="p-4 border-t" style={{ borderColor: '#EDEFF2' }}>
              <label className="label" htmlFor={`nota-${item.id}`}>
                Notas / Observaciones {guardando === item.id && <span className="normal-case font-normal text-brand-n500">· guardando…</span>}
              </label>
              <textarea id={`nota-${item.id}`} className="textarea" disabled={!editable}
                value={item.notas ?? ''} onChange={e => patchNotas(item.id, e.target.value)}
                placeholder="Hallazgos, decisiones o pendientes de este bloque, para trazabilidad" />
            </div>
          ))}
        </div>
      ))}

      {/* Registro fotográfico general + Cierre */}
      <div className="panel">
        <div className="panel-header"><h2>Registro fotográfico general de la visita</h2></div>
        <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
          {porBloque('CIERRE').map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <input type="checkbox" checked={item.foto_tomada} disabled={!editable}
                onChange={e => patchItem(item.id, { foto_tomada: e.target.checked })}
                className="cursor-pointer" aria-label={item.texto} />
              <span className="flex-1 text-sm text-slate-600">{item.texto}</span>
              <FotoUpload
                verificacionId={verificacion.id} itemId={item.id} fotoUrl={item.foto_url} disabled={!editable}
                onUploaded={path => patchItem(item.id, { foto_url: path, foto_tomada: true })}
                onRemoved={() => patchItem(item.id, { foto_url: null })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Cierre</h2></div>
        <div className="p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cabecera.declaracion_conformidad} disabled={!editable}
              onChange={e => patchCabecera({ declaracion_conformidad: e.target.checked })} />
            Declaración de conformidad para energización completada y firmada
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="firma-nombre">Nombre</label>
              <input id="firma-nombre" className="input" disabled={!editable}
                value={cabecera.firma_nombre ?? ''} onChange={e => patchCabecera({ firma_nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="firma-rut">RUT</label>
              <input id="firma-rut" className="input" disabled={!editable}
                value={cabecera.firma_rut ?? ''} onChange={e => patchCabecera({ firma_rut: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="firma-cargo">Cargo</label>
              <input id="firma-cargo" className="input" disabled={!editable}
                value={cabecera.firma_cargo ?? ''} onChange={e => patchCabecera({ firma_cargo: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
