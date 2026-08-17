'use client'
// Una tarjeta = un tablero dentro del Anexo Opcional SAT (repetible).
// Checklist itemizado — 1 fila por punto de verificación, igual de guiado
// que un alimentador del Test de Alimentadores (cada medición con su
// propio Pasa/No pasa/N/A) — ver lib/verificacionRic/anexoSat.ts.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Link2 } from 'lucide-react'
import ResultadoPills from './ResultadoPills'
import FotoUploadAnexoSat from './FotoUploadAnexoSat'
import { TIPOS_TABLERO, CATEGORIAS_CHECKLIST_SAT, ITEM_REGISTRO_FOTOGRAFICO_SAT, getTipoTablero } from '@/lib/verificacionRic/anexoSat'
import type { VerificacionRicTablero } from '@/types'

interface TableroDisponible { id: number; nombre: string; amperaje: number | null }

interface Props {
  verificacionId: number
  proyectoId: number | null
  entry: VerificacionRicTablero
  editable: boolean
  onPatch: (patch: Partial<VerificacionRicTablero>) => void
  onPatchItem: (itemId: number, resultado: 'pasa' | 'no_pasa' | 'na') => void
  onDelete: () => void
}

export default function AnexoSatTablero({ verificacionId, proyectoId, entry, editable, onPatch, onPatchItem, onDelete }: Props) {
  const [campo, setCampo] = useState({
    numero_tablero: entry.numero_tablero ?? '', nombre: entry.nombre,
    fabricante: entry.fabricante ?? '', ui: entry.ui ?? '', in_nominal: entry.in_nominal ?? '',
    notas: entry.notas ?? '',
  })
  const [tablerosDisponibles, setTablerosDisponibles] = useState<TableroDisponible[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!proyectoId || !editable) return
    let cancelado = false
    fetch(`/api/tableros?proyecto_id=${proyectoId}`)
      .then(res => res.json())
      .then(data => { if (!cancelado) setTablerosDisponibles(Array.isArray(data) ? data : []) })
    return () => { cancelado = true }
  }, [proyectoId, editable])

  const patchTexto = useCallback((campoNombre: string, valor: string) => {
    setCampo(prev => ({ ...prev, [campoNombre]: valor }))
    clearTimeout(timers.current[campoNombre])
    timers.current[campoNombre] = setTimeout(() => onPatch({ [campoNombre]: valor } as Partial<VerificacionRicTablero>), 600)
  }, [onPatch])

  const vincularTablero = (tableroId: string) => {
    if (!tableroId) { onPatch({ tablero_id: null }); return }
    const t = tablerosDisponibles.find(x => x.id === parseInt(tableroId, 10))
    onPatch({ tablero_id: parseInt(tableroId, 10), nombre: t?.nombre ?? entry.nombre })
    if (t) setCampo(prev => ({ ...prev, nombre: t.nombre }))
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{campo.nombre || 'Tablero'}</h2>
        {editable && (
          <button type="button" className="btn-icon no-print ml-auto" title="Quitar tablero" aria-label={`Quitar tablero ${campo.nombre}`}
            onClick={onDelete}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Identificación — 6 columnas */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-b" style={{ borderColor: '#EDEFF2' }}>
        <div>
          <label className="label">Tablero N°</label>
          <input className="input text-sm" disabled={!editable} value={campo.numero_tablero}
            onChange={e => patchTexto('numero_tablero', e.target.value)} placeholder="Ej: TG-1" />
        </div>
        <div>
          <label className="label">Nombre</label>
          <input className="input text-sm" disabled={!editable} value={campo.nombre}
            onChange={e => patchTexto('nombre', e.target.value)} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="select text-sm" disabled={!editable} value={entry.tipo_tablero_id ?? ''}
            onChange={e => {
              const tipo = getTipoTablero(e.target.value)
              onPatch({ tipo_tablero_id: e.target.value || null, tipo: tipo?.nombre ?? null })
            }}>
            <option value="">— Otro / no listado —</option>
            {TIPOS_TABLERO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fabricante</label>
          <input className="input text-sm" disabled={!editable} value={campo.fabricante}
            onChange={e => patchTexto('fabricante', e.target.value)} />
        </div>
        <div>
          <label className="label">Ui (tensión de placa)</label>
          <input className="input text-sm" disabled={!editable} value={campo.ui}
            onChange={e => patchTexto('ui', e.target.value)} placeholder="Ej: 400 V" />
        </div>
        <div>
          <label className="label">In (corriente nominal)</label>
          <input className="input text-sm" disabled={!editable} value={campo.in_nominal}
            onChange={e => patchTexto('in_nominal', e.target.value)} placeholder="Ej: 250 A" />
        </div>

        {editable && !!tablerosDisponibles.length && (
          <div className="col-span-2 md:col-span-3">
            <label className="label flex items-center gap-1"><Link2 size={11} /> Vincular a un tablero de esta obra (opcional)</label>
            <select className="select text-sm" value={entry.tablero_id ?? ''} onChange={e => vincularTablero(e.target.value)}>
              <option value="">— Sin vincular (datos propios de este anexo) —</option>
              {tablerosDisponibles.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.amperaje ? ` · ${t.amperaje}A` : ''}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Checklist itemizado — 1 fila por punto, agrupado en 4 categorías */}
      {CATEGORIAS_CHECKLIST_SAT.map(cat => {
        const itemsCategoria = (entry.verificaciones_ric_tableros_items ?? [])
          .filter(i => i.categoria === cat.categoria)

        if (cat.categoria === 'puntos_especificos' && !itemsCategoria.length) {
          return (
            <div key={cat.categoria} className="border-t px-4 py-3" style={{ borderColor: '#EDEFF2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--n-500)' }}>{cat.titulo}</p>
              <p className="text-xs" style={{ color: 'var(--n-500)' }}>Elige un tipo de tablero arriba para ver sus puntos específicos.</p>
            </div>
          )
        }

        return (
          <div key={cat.categoria} className="border-t" style={{ borderColor: '#EDEFF2' }}>
            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n-500)' }}>
              {cat.titulo}
            </p>
            <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
              {itemsCategoria.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-sm text-slate-700">{item.texto}</span>
                  <ResultadoPills value={item.resultado} disabled={!editable}
                    onChange={r => onPatchItem(item.id, r)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Registro fotográfico — el único ítem que sigue consolidado */}
      <div className="border-t px-4 py-2.5 flex items-center gap-3" style={{ borderColor: '#EDEFF2' }}>
        <span className="flex-1 text-sm text-slate-700">{ITEM_REGISTRO_FOTOGRAFICO_SAT}</span>
        <ResultadoPills value={entry.resultado_registro_fotografico} disabled={!editable}
          onChange={r => onPatch({ resultado_registro_fotografico: r })} />
      </div>

      {/* Notas + foto */}
      <div className="p-4 space-y-3">
        <div>
          <label className="label">Notas</label>
          <textarea className="textarea" disabled={!editable} value={campo.notas}
            onChange={e => patchTexto('notas', e.target.value)} placeholder="Observaciones de este tablero" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 flex-1">Foto general del tablero</span>
          <FotoUploadAnexoSat verificacionId={verificacionId} tableroEntryId={entry.id} fotoUrl={entry.foto_url} disabled={!editable}
            onUploaded={path => onPatch({ foto_url: path, foto_tomada: true })}
            onRemoved={() => onPatch({ foto_url: null, foto_tomada: false })} />
        </div>
      </div>
    </div>
  )
}
