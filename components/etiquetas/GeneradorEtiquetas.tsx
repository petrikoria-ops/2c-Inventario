'use client'
import { useState } from 'react'
import { Tag, Printer, RotateCcw } from 'lucide-react'

interface ProyectoSimple { id: number; ot: string; nombre: string; cliente: string | null }
interface Props { proyectos: ProyectoSimple[] }

interface LabelForm {
  obra:   string
  ot:     string
  cliente: string
  pedido: string
  fecha:  string
  bultos: string
  obs:    string
  tamano: 'a4l' | 'a5l'
}

// ── Dimensiones en px @ 96 dpi ─────────────────────────────────
const SIZES = {
  a4l: { w: 1122, h: 793,  page: 'A4 landscape'  },
  a5l: { w:  793, h: 561,  page: 'A5 landscape'  },
}

function printCSS(tamano: 'a4l' | 'a5l') {
  return `
@media screen {
  .print-labels { position: absolute; left: -9999px; top: 0; }
}
@media print {
  .no-print { display: none !important; }
  .print-labels { position: static; }
  .etiqueta {
    display: flex; flex-direction: column;
    width: 100%; height: 100vh;
    page-break-after: always; break-after: page;
    box-sizing: border-box;
  }
  .etiqueta:last-child { page-break-after: avoid; break-after: avoid; }
  @page { margin: 0; size: ${SIZES[tamano].page}; }
}`
}

// ── Contenido de una etiqueta ──────────────────────────────────
function Etiqueta({ form, pallet, total }: { form: LabelForm; pallet: number; total: number }) {
  const palletText = total > 1 ? `PALLET ${pallet} DE ${total}` : 'PALLET ÚNICO'
  const fechaFmt   = form.fecha
    ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Arial', 'Helvetica', sans-serif", overflow: 'hidden' }}>

      {/* HEADER ─ fondo oscuro */}
      <div style={{ background: '#2E333A', color: '#FFFFFF', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C" style={{ height: 40, width: 40, objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            2C Montajes y Proyectos Eléctricos
          </div>
          <div style={{ fontSize: 10, color: '#9BA3AE', marginTop: 1 }}>
            Despacho de materiales y equipos de obra
          </div>
        </div>
        {/* Badge PALLET */}
        <div style={{
          background: '#F0C000', color: '#1C1F24',
          padding: '6px 18px', borderRadius: 6,
          fontWeight: 900, fontSize: 20, letterSpacing: 1.5,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {palletText}
        </div>
      </div>

      {/* OBRA ─ zona central grande */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '18px 32px',
        background: '#F8F9FA',
        borderLeft: '8px solid #F0C000',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9BA3AE', letterSpacing: 4, marginBottom: 10, textTransform: 'uppercase' }}>
          Obra / Proyecto
        </div>
        <div style={{
          fontSize: 48, fontWeight: 900,
          color: '#2E333A', textAlign: 'center',
          lineHeight: 1.1, textTransform: 'uppercase',
          wordBreak: 'break-word',
        }}>
          {form.obra || '— SIN NOMBRE —'}
        </div>
      </div>

      {/* FOOTER ─ detalles */}
      <div style={{
        background: '#2E333A', color: '#E5E7EB',
        padding: '10px 18px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5px 28px',
        flexShrink: 0,
      }}>
        <Cell label="OT" value={form.ot || '—'} />
        <Cell label="Cliente" value={form.cliente || '—'} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Cell label="Pedido" value={form.pedido || '—'} />
        </div>
        <Cell label="Fecha" value={fechaFmt} small />
        {form.obs
          ? <Cell label="Obs." value={form.obs} small highlight />
          : <div />}
      </div>
    </div>
  )
}

function Cell({ label, value, small, highlight }: { label: string; value: string; small?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
      <span style={{ color: '#F0C000', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
        {label}:
      </span>
      <span style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: highlight ? '#FCD34D' : '#E5E7EB' }}>
        {value}
      </span>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function GeneradorEtiquetas({ proyectos }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [proyId, setProyId] = useState('')
  const [form,   setForm]   = useState<LabelForm>({
    obra: '', ot: '', cliente: '', pedido: '',
    fecha: today, bultos: '1', obs: '', tamano: 'a4l',
  })

  const set = (k: keyof LabelForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleProy = (id: string) => {
    setProyId(id)
    const p = proyectos.find(p => String(p.id) === id)
    if (p) setForm(f => ({ ...f, obra: p.nombre, ot: p.ot, cliente: p.cliente ?? '' }))
    else    setForm(f => ({ ...f, obra: '', ot: '', cliente: '' }))
  }

  const reset = () => {
    setProyId('')
    setForm({ obra: '', ot: '', cliente: '', pedido: '', fecha: today, bultos: '1', obs: '', tamano: 'a4l' })
  }

  const total   = Math.max(1, Math.min(20, parseInt(form.bultos) || 1))
  const pallets = Array.from({ length: total }, (_, i) => i + 1)
  const sz      = SIZES[form.tamano]
  const scale   = 620 / sz.w     // fit preview in ~620px wide

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS(form.tamano) }} />

      {/* ── PANTALLA ──────────────────────────────────────────── */}
      <div className="no-print p-5 max-w-6xl">

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Tag size={18} style={{ color: '#2E333A' }} />
          <div>
            <h1 className="text-lg font-bold text-slate-800">Etiquetas de obra</h1>
            <p className="text-xs text-slate-400">Imprimibles para pallets y bultos — tamaño A4 / A5 apaisado</p>
          </div>
          <button onClick={() => window.print()} className="btn btn-primary ml-auto">
            <Printer size={14} />
            {total > 1 ? `Imprimir ${total} etiquetas` : 'Imprimir etiqueta'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

          {/* FORMULARIO */}
          <div className="panel">
            <div className="panel-header">
              <Tag size={13} style={{ color: '#909090' }} />
              <h2>Datos de la etiqueta</h2>
              <button onClick={reset} className="btn btn-ghost btn-sm ml-auto">
                <RotateCcw size={12} /> Limpiar
              </button>
            </div>
            <div className="p-4 space-y-3">

              {proyectos.length > 0 && (
                <div>
                  <label className="label">Autocompletar desde OT activa</label>
                  <select className="select" value={proyId} onChange={e => handleProy(e.target.value)}>
                    <option value="">— Seleccionar proyecto —</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Obra / Nombre del proyecto *</label>
                <input className="input" placeholder="Ej: Planta Molina — Coquimbo"
                  value={form.obra} onChange={set('obra')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">N° OT</label>
                  <input className="input" placeholder="2026-014" value={form.ot} onChange={set('ot')} />
                </div>
                <div>
                  <label className="label">N° bultos / pallets</label>
                  <input className="input" type="number" min="1" max="20"
                    value={form.bultos} onChange={set('bultos')} />
                </div>
              </div>

              <div>
                <label className="label">Cliente</label>
                <input className="input" placeholder="Ej: CMPC S.A."
                  value={form.cliente} onChange={set('cliente')} />
              </div>

              <div>
                <label className="label">Identificación del pedido</label>
                <input className="input" placeholder="Ej: Tablero TG-01 / Materiales electrobarra"
                  value={form.pedido} onChange={set('pedido')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Fecha</label>
                  <input className="input" type="date" value={form.fecha} onChange={set('fecha')} />
                </div>
                <div>
                  <label className="label">Tamaño etiqueta</label>
                  <select className="select" value={form.tamano} onChange={set('tamano')}>
                    <option value="a4l">A4 apaisado (297 × 210 mm)</option>
                    <option value="a5l">A5 apaisado (210 × 148 mm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Observaciones (opcional)</label>
                <input className="input" placeholder="Ej: Frágil — vidrio"
                  value={form.obs} onChange={set('obs')} />
              </div>

            </div>
          </div>

          {/* VISTA PREVIA */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Vista previa — Pallet 1 de {total}
            </p>
            <div style={{
              width:  sz.w * scale,
              height: sz.h * scale,
              overflow: 'hidden',
              borderRadius: 8,
              boxShadow: '0 6px 32px rgba(0,0,0,0.22)',
            }}>
              <div style={{ width: sz.w, height: sz.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <Etiqueta form={form} pallet={1} total={total} />
              </div>
            </div>
            {total > 1 && (
              <p className="text-xs text-slate-400 mt-2">
                Al imprimir se generarán <strong>{total} páginas</strong>, una por cada pallet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── ÁREA DE IMPRESIÓN (off-screen en pantalla, full-page en print) ── */}
      <div className="print-labels" aria-hidden>
        {pallets.map(n => (
          <div key={n} className="etiqueta">
            <Etiqueta form={form} pallet={n} total={total} />
          </div>
        ))}
      </div>
    </>
  )
}
