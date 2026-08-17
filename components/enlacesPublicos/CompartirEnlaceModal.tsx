'use client'
// Botón + modal para generar y administrar enlaces públicos (sin login) de
// una verificación puntual — usado en el header de los 4 Formulario* de
// verificaciones (RIC, DRS, Prevención, Alimentadores).
import { useState } from 'react'
import { Link2, Copy, Check, Ban, RotateCcw } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import type { EnlacePublico, ModuloPublico } from '@/types'

interface Props {
  modulo: ModuloPublico
  // null = enlace "en blanco" (todavía no hay registro, lo crea la persona
  // externa desde cero) — usado desde la tabla/listado del módulo en vez
  // del detalle de un registro puntual.
  registroId: number | null
  numero?: string
  label?: string
}

function fechaPorDefecto(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function estadoEnlace(e: EnlacePublico): { texto: string; clase: string } {
  if (!e.activo) return { texto: 'Revocado', clase: 'badge-gray' }
  if (new Date(e.expira_en) < new Date()) return { texto: 'Vencido', clase: 'badge-gray' }
  if (e.completado_en) return { texto: 'Completado', clase: 'badge-green' }
  return { texto: 'Activo', clase: 'badge-yellow' }
}

export default function CompartirEnlaceModal({ modulo, registroId, numero, label }: Props) {
  const [open, setOpen] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [enlaces, setEnlaces] = useState<EnlacePublico[]>([])
  const [generando, setGenerando] = useState(false)
  const [expiraEn, setExpiraEn] = useState(fechaPorDefecto())
  const [descripcion, setDescripcion] = useState('')
  const [copiado, setCopiado] = useState<number | null>(null)
  const { showToast } = useToast()

  const cargar = async () => {
    setCargando(true)
    try {
      const query = registroId ? `registro_id=${registroId}` : ''
      const res = await fetch(`/api/enlaces-publicos?modulo=${modulo}&${query}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar los enlaces')
      setEnlaces(data)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setCargando(false)
    }
  }

  const abrir = () => { setOpen(true); cargar() }

  const urlDe = (token: string) => `${window.location.origin}/completar/${token}`

  const copiar = async (enlace: EnlacePublico) => {
    await navigator.clipboard.writeText(urlDe(enlace.token))
    setCopiado(enlace.id)
    setTimeout(() => setCopiado(null), 1500)
  }

  const generar = async () => {
    if (!expiraEn) { showToast('Elige una fecha de vencimiento', 'error'); return }
    setGenerando(true)
    try {
      const res = await fetch('/api/enlaces-publicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulo, registro_id: registroId, descripcion: descripcion.trim() || null,
          expira_en: new Date(`${expiraEn}T23:59:59`).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo generar el enlace')
      setDescripcion('')
      await cargar()
      await navigator.clipboard.writeText(urlDe(data.token))
      showToast('Enlace generado y copiado al portapapeles', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setGenerando(false)
    }
  }

  const revocar = async (enlace: EnlacePublico) => {
    const res = await fetch(`/api/enlaces-publicos/${enlace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !enlace.activo }),
    })
    if (!res.ok) { showToast('No se pudo actualizar el enlace', 'error'); return }
    cargar()
  }

  return (
    <>
      <button className="btn btn-outline btn-sm" onClick={abrir}>
        <Link2 size={13} /> {label ?? 'Compartir enlace'}
      </button>

      <Modal open={open} title={numero ? `Enlace público — ${numero}` : 'Enlace en blanco'} onClose={() => setOpen(false)} hideFooter wide>
        <div className="space-y-4">
          <p className="text-sm text-brand-n500">
            {registroId
              ? 'Genera un link para que alguien fuera de la app (sin cuenta) complete y firme esta verificación desde su celular. Queda registrado en la app apenas lo envía.'
              : 'Genera un link en blanco para que alguien fuera de la app (sin cuenta) cree una verificación nueva desde cero — obra, datos generales, checklist y firma. Queda registrada en la app apenas la envía.'}
          </p>

          <div className="flex flex-col md:flex-row gap-2 md:items-end p-3 rounded-lg" style={{ background: '#F5F6F7' }}>
            <div className="flex-1">
              <label className="label" htmlFor="enlace-descripcion">Para (opcional)</label>
              <input id="enlace-descripcion" className="input" placeholder="Ej: Juan Pérez, DRS"
                value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="enlace-expira">Vence el</label>
              <input id="enlace-expira" type="date" className="input" value={expiraEn}
                onChange={e => setExpiraEn(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={generar} disabled={generando}>
              {generando ? 'Generando…' : 'Generar enlace'}
            </button>
          </div>

          <div>
            {cargando && <p className="text-sm text-brand-n500">Cargando enlaces…</p>}
            {!cargando && !enlaces.length && (
              <p className="text-sm text-brand-n500">
                {registroId ? 'Todavía no se ha compartido esta verificación.' : 'Todavía no se ha generado ningún enlace en blanco.'}
              </p>
            )}
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {enlaces.map(enlace => {
                const est = estadoEnlace(enlace)
                return (
                  <div key={enlace.id} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${est.clase}`}>{est.texto}</span>
                        {enlace.descripcion && <span className="text-sm text-slate-700 truncate">{enlace.descripcion}</span>}
                      </div>
                      <p className="text-xs text-brand-n500 mt-0.5">
                        Vence {new Date(enlace.expira_en).toLocaleDateString('es-CL')}
                        {enlace.completado_en && ` · Llenado por ${enlace.completado_por_nombre ?? 'alguien'} el ${new Date(enlace.completado_en).toLocaleDateString('es-CL')}`}
                      </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => copiar(enlace)} aria-label="Copiar enlace">
                      {copiado === enlace.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => revocar(enlace)}
                      aria-label={enlace.activo ? 'Revocar enlace' : 'Reactivar enlace'}>
                      {enlace.activo ? <Ban size={13} /> : <RotateCcw size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
