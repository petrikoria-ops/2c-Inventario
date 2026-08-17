'use client'
// Versión pública (sin login) de una tarjeta del Anexo SAT. A diferencia de
// components/verificacionRic/AnexoSatTablero.tsx, NO tiene el selector
// "vincular a un tablero existente" — quien llena por enlace público no
// tiene por qué ver la lista interna de tableros de la obra (Taller); solo
// tipea los datos del tablero directamente. Checklist itemizado igual que
// la versión interna — ver lib/verificacionRic/anexoSat.ts.
import { Trash2 } from 'lucide-react'
import PillsPublico from './PillsPublico'
import FotoCampoPublico from './FotoCampoPublico'
import { TIPOS_TABLERO, CATEGORIAS_CHECKLIST_SAT, ITEM_REGISTRO_FOTOGRAFICO_SAT, getTipoTablero } from '@/lib/verificacionRic/anexoSat'

type Registro = Record<string, any>

interface Props {
  token: string
  entry: Registro
  previewUrlInicial?: string
  onPatch: (patch: Registro) => void
  onPatchItem: (itemId: number, resultado: 'pasa' | 'no_pasa' | 'na') => void
  onDelete: () => void
}

export default function AnexoSatTableroPublico({ token, entry, previewUrlInicial, onPatch, onPatchItem, onDelete }: Props) {
  const items: Registro[] = entry.verificaciones_ric_tableros_items ?? []

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

      {/* Checklist itemizado — 1 fila por punto, agrupado en 4 categorías */}
      {CATEGORIAS_CHECKLIST_SAT.map(cat => {
        const itemsCategoria = items.filter(i => i.categoria === cat.categoria)

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
                  <PillsPublico value={item.resultado} opciones={['pasa', 'no_pasa', 'na']}
                    onChange={r => onPatchItem(item.id, r as 'pasa' | 'no_pasa' | 'na')} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Registro fotográfico — el único ítem que sigue consolidado */}
      <div className="border-t px-4 py-2.5 flex items-center gap-3" style={{ borderColor: '#EDEFF2' }}>
        <span className="flex-1 text-sm text-slate-700">{ITEM_REGISTRO_FOTOGRAFICO_SAT}</span>
        <PillsPublico value={entry.resultado_registro_fotografico ?? null} opciones={['pasa', 'no_pasa', 'na']}
          onChange={r => onPatch({ resultado_registro_fotografico: r })} />
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
