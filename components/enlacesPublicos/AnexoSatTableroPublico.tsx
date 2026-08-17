'use client'
// Versión pública (sin login) de una tarjeta del Anexo SAT. A diferencia de
// components/verificacionRic/AnexoSatTablero.tsx, NO tiene el selector
// "vincular a un tablero existente" — quien llena por enlace público no
// tiene por qué ver la lista interna de tableros de la obra (Taller); solo
// tipea los datos del tablero directamente.
import { useState } from 'react'
import { Trash2, Info } from 'lucide-react'
import PillsPublico from './PillsPublico'
import FotoCampoPublico from './FotoCampoPublico'
import {
  TIPOS_TABLERO, ITEMS_CHECKLIST_SAT, REQUISITOS_TERRENO_SAT,
  NUCLEO_IEC_ENSAYOS, NUCLEO_IEC_INSPECCION, getTipoTablero, type CampoChecklistSat,
} from '@/lib/verificacionRic/anexoSat'

type Registro = Record<string, any>

interface Props {
  token: string
  entry: Registro
  previewUrlInicial?: string
  onPatch: (patch: Registro) => void
  onDelete: () => void
}

function ayudaItem(campo: CampoChecklistSat, tipoTableroId: string | null): string[] | null {
  if (campo === 'resultado_ensayos_instrumento') return NUCLEO_IEC_ENSAYOS.map(e => `${e.prueba} (${e.criterio})`)
  if (campo === 'resultado_inspeccion') return NUCLEO_IEC_INSPECCION.map(i => i.verificacion)
  if (campo === 'resultado_requisitos_terreno') return REQUISITOS_TERRENO_SAT
  if (campo === 'resultado_puntos_especificos') return getTipoTablero(tipoTableroId)?.puntosEspecificos ?? null
  return null
}

export default function AnexoSatTableroPublico({ token, entry, previewUrlInicial, onPatch, onDelete }: Props) {
  const [ayudaAbierta, setAyudaAbierta] = useState<CampoChecklistSat | null>(null)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.nombre || 'Tablero'}</h2>
        <button type="button" className="btn-icon ml-auto" title="Quitar tablero" aria-label={`Quitar tablero ${entry.nombre}`}
          onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-b" style={{ borderColor: '#EDEFF2' }}>
        <div>
          <label className="label">Tablero N°</label>
          <input className="input text-sm" defaultValue={entry.numero_tablero ?? ''}
            onChange={e => onPatch({ numero_tablero: e.target.value })} placeholder="Ej: TG-1" />
        </div>
        <div>
          <label className="label">Nombre</label>
          <input className="input text-sm" defaultValue={entry.nombre ?? ''}
            onChange={e => onPatch({ nombre: e.target.value })} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="select text-sm" defaultValue={entry.tipo_tablero_id ?? ''}
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
          <input className="input text-sm" defaultValue={entry.fabricante ?? ''}
            onChange={e => onPatch({ fabricante: e.target.value })} />
        </div>
        <div>
          <label className="label">Ui (tensión de placa)</label>
          <input className="input text-sm" defaultValue={entry.ui ?? ''}
            onChange={e => onPatch({ ui: e.target.value })} placeholder="Ej: 400 V" />
        </div>
        <div>
          <label className="label">In (corriente nominal)</label>
          <input className="input text-sm" defaultValue={entry.in_nominal ?? ''}
            onChange={e => onPatch({ in_nominal: e.target.value })} placeholder="Ej: 250 A" />
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
        {ITEMS_CHECKLIST_SAT.map(item => {
          const ayuda = ayudaItem(item.campo, entry.tipo_tablero_id)
          const abierta = ayudaAbierta === item.campo
          return (
            <div key={item.campo} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <button type="button" className="flex-1 text-left text-sm text-slate-700 flex items-center gap-1.5"
                  onClick={() => setAyudaAbierta(abierta ? null : item.campo)}>
                  {item.texto}
                  {ayuda && <Info size={12} style={{ color: 'var(--n-500)' }} />}
                </button>
                <PillsPublico value={entry[item.campo] ?? null} opciones={['pasa', 'no_pasa', 'na']}
                  onChange={r => onPatch({ [item.campo]: r })} />
              </div>
              {abierta && ayuda && (
                <ul className="mt-2 pl-4 text-xs list-disc space-y-0.5" style={{ color: 'var(--n-500)' }}>
                  {ayuda.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="label">Notas</label>
          <textarea className="textarea" defaultValue={entry.notas ?? ''}
            onChange={e => onPatch({ notas: e.target.value })} placeholder="Observaciones de este tablero" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 flex-1">Foto general del tablero</span>
          <FotoCampoPublico token={token} itemId={entry.id} previewUrlInicial={previewUrlInicial}
            endpoint={`/api/publico/${token}/tableros/${entry.id}/foto`}
            onUploaded={path => onPatch({ foto_url: path, foto_tomada: true })}
            onRemoved={() => onPatch({ foto_url: null, foto_tomada: false })} />
        </div>
      </div>
    </div>
  )
}
