'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag, Printer, RotateCcw, Sliders } from 'lucide-react'

interface ProyectoSimple { id: number; ot: string; nombre: string; cliente: string | null }
interface Props { proyectos: ProyectoSimple[] }

interface LabelForm {
  obra:    string
  ot:      string
  cliente: string
  pedido:  string
  fecha:   string
  bultos:  string
  obs:     string
  tamano:  'a4l' | 'a5l'
}

interface LabelStyle {
  obraSize:    number  // font-size del nombre de obra (px)
  obraOffsetY: number  // desplazamiento vertical del bloque obra respecto al centro (px, escala real)
  footerSize:  number  // font-size del texto del footer (px)
}

const DEFAULT_STYLE: LabelStyle = { obraSize: 48, obraOffsetY: 0, footerSize: 13 }

// ── Dimensiones en px @ 96 dpi ─────────────────────────────────
const SIZES = {
  a4l: { w: 1122, h: 793, page: 'A4 landscape' },
  a5l: { w:  793, h: 561, page: 'A5 landscape' },
}

const PREVIEW_W = 620   // ancho fijo del área de preview en pantalla

function printCSS(tamano: 'a4l' | 'a5l') {
  return `
@media screen {
  .print-labels { position: absolute; left: -9999px; top: 0; }
}
@media print {
  body > *        { display: none !important; }
  body            { display: block !important; }
  main            { display: block !important; margin: 0 !important; padding: 0 !important; }
  main > *        { display: none !important; }
  main .print-labels-root { display: block !important; }
  .print-labels   { display: block !important; position: static !important; left: 0 !important; }
  .etiqueta {
    display: flex !important; flex-direction: column !important;
    width: 100vw; height: 100vh;
    page-break-after: always; break-after: page;
    box-sizing: border-box; overflow: hidden;
  }
  .etiqueta:last-child { page-break-after: avoid; break-after: avoid; }
  @page { margin: 0; size: ${SIZES[tamano].page}; }
}`
}

// ── Contenido de una etiqueta ──────────────────────────────────
interface EtiquetaProps {
  form:    LabelForm
  pallet:  number
  total:   number
  style:   LabelStyle
  /** Si true, el bloque obra acepta drag (solo en preview) */
  onObraDragStart?: (e: React.MouseEvent) => void
}

function Etiqueta({ form, pallet, total, style, onObraDragStart }: EtiquetaProps) {
  const palletText = total > 1 ? `PALLET ${pallet} DE ${total}` : 'PALLET ÚNICO'
  const fechaFmt   = form.fecha
    ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Arial','Helvetica',sans-serif", overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ background: '#2E333A', color: '#fff', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
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
        <div style={{ background: '#F0C000', color: '#1C1F24', padding: '6px 18px', borderRadius: 6, fontWeight: 900, fontSize: 20, letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {palletText}
        </div>
      </div>

      {/* OBRA — zona central, arrastrable en preview */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 32px', background: '#F8F9FA', borderLeft: '8px solid #F0C000', position: 'relative', overflow: 'hidden' }}
      >
        <div
          onMouseDown={onObraDragStart}
          style={{
            position:   'relative',
            top:        style.obraOffsetY,
            cursor:     onObraDragStart ? 'grab' : 'default',
            userSelect: 'none',
            textAlign:  'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9BA3AE', letterSpacing: 4, marginBottom: 10, textTransform: 'uppercase' }}>
            Obra / Proyecto
          </div>
          <div style={{ fontSize: style.obraSize, fontWeight: 900, color: '#2E333A', lineHeight: 1.05, textTransform: 'uppercase', wordBreak: 'break-word' }}>
            {form.obra || '— SIN NOMBRE —'}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: '#2E333A', color: '#E5E7EB', padding: '10px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 28px', flexShrink: 0 }}>
        <Cell label="OT"      value={form.ot      || '—'} fs={style.footerSize} />
        <Cell label="Cliente" value={form.cliente  || '—'} fs={style.footerSize} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Cell label="Pedido" value={form.pedido  || '—'} fs={style.footerSize} />
        </div>
        <Cell label="Fecha"   value={fechaFmt}             fs={style.footerSize} small />
        {form.obs ? <Cell label="Obs." value={form.obs}    fs={style.footerSize} small highlight /> : <div />}
      </div>
    </div>
  )
}

function Cell({ label, value, small, highlight, fs }: { label: string; value: string; small?: boolean; highlight?: boolean; fs: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
      <span style={{ color: '#F0C000', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
        {label}:
      </span>
      <span style={{ fontSize: small ? Math.max(fs - 1, 9) : fs, fontWeight: 600, color: highlight ? '#FCD34D' : '#E5E7EB' }}>
        {value}
      </span>
    </div>
  )
}

// ── Slider con etiqueta ────────────────────────────────────────
function StyleSlider({ label, value, min, max, step = 1, unit = 'px', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-mono text-slate-500">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#F0C000' }}
      />
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function GeneradorEtiquetas({ proyectos }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [proyId,    setProyId]    = useState('')
  const [form,      setForm]      = useState<LabelForm>({ obra: '', ot: '', cliente: '', pedido: '', fecha: today, bultos: '1', obs: '', tamano: 'a4l' })
  const [labelStyle, setLabelStyle] = useState<LabelStyle>(DEFAULT_STYLE)

  // ── Estado de drag ──────────────────────────────────────────
  const dragRef  = useRef<{ startY: number; startOffset: number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleObraDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const sz    = SIZES[form.tamano]
    const scale = PREVIEW_W / sz.w
    dragRef.current = { startY: e.clientY, startOffset: labelStyle.obraOffsetY }
  }, [form.tamano, labelStyle.obraOffsetY])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const sz    = SIZES[form.tamano]
      const scale = PREVIEW_W / sz.w
      const deltaScreen = e.clientY - dragRef.current.startY
      const deltaReal   = deltaScreen / scale
      const maxOffset   = sz.h * 0.28   // limitar a ±28% del alto
      const next = Math.max(-maxOffset, Math.min(maxOffset, dragRef.current.startOffset + deltaReal))
      setLabelStyle(s => ({ ...s, obraOffsetY: Math.round(next) }))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [form.tamano])

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
    setLabelStyle(DEFAULT_STYLE)
  }

  const total   = Math.max(1, Math.min(20, parseInt(form.bultos) || 1))
  const pallets = Array.from({ length: total }, (_, i) => i + 1)
  const sz      = SIZES[form.tamano]
  const scale   = PREVIEW_W / sz.w

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS(form.tamano) }} />

      {/* ── PANTALLA ──────────────────────────────────────────── */}
      <div className="no-print p-5 max-w-[1400px]">

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

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">

          {/* COLUMNA IZQ: Formulario + Editor de estilo */}
          <div className="space-y-4">

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
                  <input className="input" placeholder="Ej: Planta Molina — Coquimbo" value={form.obra} onChange={set('obra')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">N° OT</label>
                    <input className="input" placeholder="2026-014" value={form.ot} onChange={set('ot')} />
                  </div>
                  <div>
                    <label className="label">N° bultos / pallets</label>
                    <input className="input" type="number" min="1" max="20" value={form.bultos} onChange={set('bultos')} />
                  </div>
                </div>

                <div>
                  <label className="label">Cliente</label>
                  <input className="input" placeholder="Ej: CMPC S.A." value={form.cliente} onChange={set('cliente')} />
                </div>

                <div>
                  <label className="label">Identificación del pedido</label>
                  <input className="input" placeholder="Ej: Tablero TG-01 / Materiales electrobarra" value={form.pedido} onChange={set('pedido')} />
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
                  <input className="input" placeholder="Ej: Frágil — vidrio" value={form.obs} onChange={set('obs')} />
                </div>

              </div>
            </div>

            {/* EDITOR DE ESTILO */}
            <div className="panel">
              <div className="panel-header">
                <Sliders size={13} style={{ color: '#909090' }} />
                <h2>Ajustar apariencia</h2>
                <button
                  onClick={() => setLabelStyle(DEFAULT_STYLE)}
                  className="btn btn-ghost btn-sm ml-auto text-xs"
                  title="Restablecer valores por defecto"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
              <div className="p-4 space-y-4">

                <StyleSlider
                  label="Tamaño del nombre de obra"
                  value={labelStyle.obraSize}
                  min={24} max={80} step={2}
                  onChange={v => setLabelStyle(s => ({ ...s, obraSize: v }))}
                />

                <StyleSlider
                  label="Posición vertical del nombre"
                  value={labelStyle.obraOffsetY}
                  min={-150} max={150} step={5} unit="px"
                  onChange={v => setLabelStyle(s => ({ ...s, obraOffsetY: v }))}
                />

                <StyleSlider
                  label="Tamaño texto del footer"
                  value={labelStyle.footerSize}
                  min={9} max={18} step={1}
                  onChange={v => setLabelStyle(s => ({ ...s, footerSize: v }))}
                />

                <p className="text-[11px] text-slate-400 pt-1">
                  También puedes arrastrar el nombre de obra en la vista previa para reposicionarlo.
                </p>
              </div>
            </div>

          </div>

          {/* VISTA PREVIA */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Vista previa — Pallet 1 de {total}
              <span className="ml-2 normal-case font-normal text-slate-400 text-[10px]">
                (lo que ves es exactamente lo que se imprime)
              </span>
            </p>
            <div
              ref={previewRef}
              style={{ width: sz.w * scale, height: sz.h * scale, overflow: 'hidden', borderRadius: 8, boxShadow: '0 6px 32px rgba(0,0,0,0.22)', cursor: 'default' }}
            >
              <div style={{ width: sz.w, height: sz.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <Etiqueta
                  form={form} pallet={1} total={total}
                  style={labelStyle}
                  onObraDragStart={handleObraDragStart}
                />
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

      {/* ── ÁREA DE IMPRESIÓN ─────────────────────────────────── */}
      <div className="print-labels-root">
        <div className="print-labels" aria-hidden>
          {pallets.map(n => (
            <div key={n} className="etiqueta">
              <Etiqueta form={form} pallet={n} total={total} style={labelStyle} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
