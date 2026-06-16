'use client'
import { useState, useRef } from 'react'
import { Printer, CheckSquare, RotateCcw } from 'lucide-react'

// ─── Checklist data ────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'mecanico',
    title: '1. Armado mecánico',
    items: [
      'Gabinete con grado IP adecuado al ambiente',
      'Riel DIN correctamente fijado',
      'Canaletas instaladas y aseguradas',
      'Separadores de borneras instalados',
      'Prensaestopas apretados y sellados',
      'Placa de bornes fijada',
      'Puerta con sello perimetral en buen estado',
      'Etiqueta identificatoria del tablero',
    ],
  },
  {
    id: 'cableado',
    title: '2. Cableado',
    items: [
      'Sección de conductores correcta según diseño',
      'Ferrules instalados en todos los extremos',
      'Colores de conductores según RIC',
      'Conductores debidamente identificados',
      'Borneras numeradas correlativamente',
      'Conductor de tierra conectado a barra PE',
      'Sin cruces entre cableado de fuerza y control',
      'Tornillos de terminales apretados (torque)',
    ],
  },
  {
    id: 'pruebas',
    title: '3. Pruebas y comisionamiento',
    items: [
      'Resistencia de aislación > 1 MΩ (megóhmetro)',
      'Continuidad de conductor de tierra verificada',
      'Tensión de alimentación correcta (± 5%)',
      'Secuencia de fases correcta (sistemas trifásicos)',
      'Prueba individual de cada protección',
      'Pulsadores e indicadores luminosos operativos',
      'Disparo de diferencial verificado',
      'Relé térmico ajustado a la corriente nominal',
      'Fotografías del tablero terminado tomadas',
      'Planos conforme a obra actualizados',
    ],
  },
]

type CheckKey = string // `${sectionId}_${index}`

// ─── Print styles ──────────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body { margin: 0; background: white; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .page { padding: 20mm 18mm; font-family: 'Arial', sans-serif; }
  h1 { font-size: 14pt; font-weight: bold; margin-bottom: 4pt; color: #2E333A; }
  h2 { font-size: 10pt; font-weight: bold; margin: 12pt 0 4pt; color: #2E333A;
       border-bottom: 1pt solid #D8D8D8; padding-bottom: 3pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
  td, th { border: 0.5pt solid #CCCCCC; padding: 4pt 6pt; font-size: 9pt; vertical-align: top; }
  th { background: #2E333A; color: white; font-weight: bold; }
  .check-cell { width: 22pt; text-align: center; }
  .obs-row td { height: 28pt; }
  .header-block { display: flex; justify-content: space-between; border: 0.5pt solid #CCC;
                  padding: 8pt; margin-bottom: 10pt; gap: 12pt; }
  .header-field { flex: 1; font-size: 9pt; }
  .header-field strong { display: block; font-size: 7.5pt; color: #666; margin-bottom: 2pt; }
  .header-field span { border-bottom: 0.5pt solid #999; display: block; min-height: 14pt; padding-bottom: 2pt; }
  .company-header { border-bottom: 1.5pt solid #F0C000; padding-bottom: 6pt; margin-bottom: 10pt;
                    display: flex; justify-content: space-between; align-items: flex-end; }
  .doc-title { font-size: 9pt; color: #666; }
  .doc-number { font-size: 11pt; font-weight: bold; color: #F0C000; }
  .warning { font-size: 7pt; color: #888; margin-top: 8pt; border-top: 0.5pt solid #EEE; padding-top: 4pt; }
}
@media screen {
  .print-only { display: none; }
}
`

export default function ChecklistPage() {
  // Tablero form data
  const [form, setForm] = useState({
    ot:        '',
    tablero:   '',
    cliente:   '',
    tecnico:   '',
    fecha:     new Date().toISOString().split('T')[0],
    obs:       '',
  })

  // Checklist state
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({})
  const toggle = (k: CheckKey) => setChecks(p => ({ ...p, [k]: !p[k] }))
  const resetAll = () => { if (confirm('¿Reiniciar todo el checklist?')) { setChecks({}) } }

  const totalItems  = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const doneItems   = Object.values(checks).filter(Boolean).length
  const pct         = Math.round((doneItems / totalItems) * 100)

  const handlePrint = () => window.print()

  const fmt = (d: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="page">
        {/* ── Screen header ─────────────────────────────── */}
        <div className="no-print p-5 max-w-4xl">
          <div className="flex items-center gap-2 mb-5">
            <CheckSquare size={18} style={{ color: '#2E333A' }} />
            <h1 className="text-lg font-bold text-slate-800">Checklist de tablero eléctrico</h1>
            <div className="ml-auto flex gap-2">
              <button onClick={resetAll} className="btn btn-ghost btn-sm">
                <RotateCcw size={13} /> Reiniciar
              </button>
              <button onClick={handlePrint} className="btn btn-primary btn-sm">
                <Printer size={13} /> Imprimir / PDF
              </button>
            </div>
          </div>

          {/* Datos del tablero */}
          <div className="panel mb-5">
            <div className="panel-header">
              <h2>Datos del tablero</h2>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="label">N° OT</label>
                <input className="input w-full" placeholder="OT-2026-001" value={form.ot}
                  onChange={e => setForm(p => ({ ...p, ot: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Nombre del tablero</label>
                <input className="input w-full" placeholder="Tablero TG-01 Galpón Norte" value={form.tablero}
                  onChange={e => setForm(p => ({ ...p, tablero: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cliente</label>
                <input className="input w-full" placeholder="Empresa cliente" value={form.cliente}
                  onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))} />
              </div>
              <div>
                <label className="label">Técnico responsable</label>
                <input className="input w-full" placeholder="Nombre técnico" value={form.tecnico}
                  onChange={e => setForm(p => ({ ...p, tecnico: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fecha de inspección</label>
                <input type="date" className="input w-full" value={form.fecha}
                  onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : '#F0C000' }} />
            </div>
            <span className="text-sm font-bold text-slate-700">{doneItems} / {totalItems}</span>
            <span className="text-xs text-slate-400">{pct}%</span>
          </div>

          {/* Checklist sections */}
          {SECTIONS.map(sec => {
            const secDone = sec.items.filter((_, i) => checks[`${sec.id}_${i}`]).length
            return (
              <div key={sec.id} className="panel mb-4">
                <div className="panel-header">
                  <h2>{sec.title}</h2>
                  <span className="badge badge-blue text-xs">{secDone}/{sec.items.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {sec.items.map((item, i) => {
                    const k = `${sec.id}_${i}` as CheckKey
                    return (
                      <label key={k} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                        ${checks[k] ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={!!checks[k]} onChange={() => toggle(k)}
                          className="w-4 h-4 flex-shrink-0 accent-green-600" />
                        <span className={`text-sm ${checks[k] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Observaciones */}
          <div className="panel mb-5">
            <div className="panel-header"><h2>Observaciones generales</h2></div>
            <div className="p-4">
              <textarea className="textarea w-full" rows={4}
                placeholder="Notas, pendientes, condiciones especiales…"
                value={form.obs} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* ── PRINT-ONLY LAYOUT ─────────────────────────── */}
        <div className="print-only" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Company header */}
          <div className="company-header">
            <div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#2E333A' }}>
                2C MONTAJES Y PROYECTOS ELÉCTRICOS
              </div>
              <div className="doc-title">CHECKLIST DE ARMADO Y PRUEBAS DE TABLERO ELÉCTRICO</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="doc-title">N° OT</div>
              <div className="doc-number">{form.ot || '—'}</div>
            </div>
          </div>

          {/* Tablero data grid */}
          <div className="header-block">
            <div className="header-field">
              <strong>TABLERO</strong><span>{form.tablero || '—'}</span>
            </div>
            <div className="header-field">
              <strong>CLIENTE</strong><span>{form.cliente || '—'}</span>
            </div>
            <div className="header-field">
              <strong>TÉCNICO RESPONSABLE</strong><span>{form.tecnico || '—'}</span>
            </div>
            <div className="header-field">
              <strong>FECHA INSPECCIÓN</strong><span>{fmt(form.fecha)}</span>
            </div>
          </div>

          {/* Checklist tables */}
          {SECTIONS.map(sec => (
            <div key={sec.id}>
              <h2>{sec.title}</h2>
              <table>
                <thead>
                  <tr>
                    <th className="check-cell">OK</th>
                    <th>Ítem de verificación</th>
                    <th style={{ width: '30%' }}>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map((item, i) => {
                    const k = `${sec.id}_${i}` as CheckKey
                    return (
                      <tr key={k}>
                        <td className="check-cell" style={{ textAlign: 'center', fontWeight: 'bold',
                          color: checks[k] ? '#059669' : '#999' }}>
                          {checks[k] ? '✓' : '○'}
                        </td>
                        <td style={{ color: checks[k] ? '#555' : '#000' }}>{item}</td>
                        <td></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Observaciones */}
          {form.obs && (
            <div>
              <h2>Observaciones generales</h2>
              <p style={{ fontSize: 9, color: '#333', marginTop: 4 }}>{form.obs}</p>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
            {[
              { label: 'Técnico responsable', name: form.tecnico },
              { label: 'Revisado por', name: '' },
              { label: 'Cliente / receptor', name: form.cliente },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, borderTop: '1pt solid #2E333A', paddingTop: 4 }}>
                <div style={{ fontSize: 9, color: '#555' }}>{s.label}</div>
                {s.name && <div style={{ fontSize: 9, fontWeight: 'bold' }}>{s.name}</div>}
                <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>Firma</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="warning">
            Documento generado por sistema de inventario 2C Montajes y Proyectos Eléctricos.
            Impreso el {new Date().toLocaleDateString('es-CL')}.
            Los ítems marcados con ○ no fueron verificados al momento de la impresión.
          </p>
        </div>
      </div>
    </>
  )
}
