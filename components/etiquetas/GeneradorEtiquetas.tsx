'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag, Printer, RotateCcw, Sliders, LayoutGrid } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface ProyectoSimple { id: number; ot: string; nombre: string; cliente: string | null }
interface Props { proyectos: ProyectoSimple[] }

type TemplateId   = 'pallet' | 'rack' | 'cajon' | 'generica'
type SheetSizeKey = 'a4l' | 'a5l' | 'cartal' | 'carta' | 'a4p'

interface LabelForm {
  // Pallet
  obra: string; ot: string; cliente: string; pedido: string
  fecha: string; bultos: string; obs: string
  // Rack / Cajón / Genérica
  codigo: string; nombre: string; descripcion: string; detalle: string; cantidad: string
  // Genérica custom size
  anchoMm: string; altoMm: string
  // Shared
  tamano: SheetSizeKey; template: TemplateId; font: string
}

interface LabelStyle {
  mainSize:   number   // obra / código font size
  offsetY:    number   // vertical offset (pallet only)
  footerSize: number   // footer / description size
}

// ── Dimensiones hojas (px @ 96 dpi, 1mm ≈ 3.7795 px) ─────────────
const SIZES: Record<SheetSizeKey, { w: number; h: number; page: string; mm: { w: number; h: number } }> = {
  a4l:   { w:1122, h: 794, page:'A4 landscape',    mm:{ w:297, h:210 } },
  a5l:   { w: 794, h: 561, page:'A5 landscape',    mm:{ w:210, h:148 } },
  cartal:{ w:1056, h: 816, page:'letter landscape', mm:{ w:279, h:216 } },
  carta: { w: 816, h:1056, page:'letter portrait',  mm:{ w:216, h:279 } },
  a4p:   { w: 794, h:1123, page:'A4 portrait',     mm:{ w:210, h:297 } },
}

// Dimensiones de etiquetas pequeñas en mm
const LABEL_MM = {
  rack:  { w: 95, h: 45, gap: 5 },
  cajon: { w: 63, h: 38, gap: 3 },
}

const FONTS = [
  { label:'Arial (por defecto)',  value:'Arial, Helvetica, sans-serif' },
  { label:'Helvetica',           value:'Helvetica, Arial, sans-serif' },
  { label:'Times New Roman',     value:"'Times New Roman', Times, serif" },
  { label:'Calibri',             value:"Calibri, 'Gill Sans', sans-serif" },
  { label:'Verdana',             value:'Verdana, Geneva, sans-serif' },
  { label:'Georgia',             value:"Georgia, 'Times New Roman', serif" },
  { label:'Courier New',         value:"'Courier New', Courier, monospace" },
]

const SHEET_OPTIONS: Record<TemplateId, SheetSizeKey[]> = {
  pallet:  ['a4l', 'a5l', 'cartal'],
  rack:    ['carta', 'a4p', 'cartal'],
  cajon:   ['carta', 'a4p', 'cartal'],
  generica:['carta', 'a4p', 'a4l', 'cartal'],
}

const SHEET_LABELS: Record<SheetSizeKey, string> = {
  a4l:   'A4 apaisado (297 × 210 mm)',
  a5l:   'A5 apaisado (210 × 148 mm)',
  cartal:'Carta apaisado (279 × 216 mm)',
  carta: 'Carta vertical (216 × 279 mm)',
  a4p:   'A4 vertical (210 × 297 mm)',
}

const STYLE_DEFAULTS: Record<TemplateId, LabelStyle> = {
  pallet:  { mainSize:48, offsetY:0, footerSize:13 },
  rack:    { mainSize:28, offsetY:0, footerSize:11 },
  cajon:   { mainSize:20, offsetY:0, footerSize: 9 },
  generica:{ mainSize:22, offsetY:0, footerSize:10 },
}

const STYLE_RANGES: Record<TemplateId, { mainMin:number; mainMax:number; footerMin:number; footerMax:number }> = {
  pallet:  { mainMin:24, mainMax:80,  footerMin:9,  footerMax:18 },
  rack:    { mainMin:14, mainMax:40,  footerMin:7,  footerMax:16 },
  cajon:   { mainMin:10, mainMax:28,  footerMin:6,  footerMax:13 },
  generica:{ mainMin:10, mainMax:40,  footerMin:7,  footerMax:16 },
}

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  pallet:  'Pallet / Obra',
  rack:    'Rack / Estante',
  cajon:   'Organizador / Cajón',
  generica:'Genérica configurable',
}

const PREVIEW_W = 620   // ancho preview pallet
const SMALL_PREVIEW_W = 380  // ancho preview etiquetas pequeñas

// ── Grid helpers ───────────────────────────────────────────────────
function getLabelMm(form: LabelForm) {
  if (form.template === 'rack')  return LABEL_MM.rack
  if (form.template === 'cajon') return LABEL_MM.cajon
  return {
    w: Math.max(30, Math.min(200, parseFloat(form.anchoMm) || 63)),
    h: Math.max(20, Math.min(200, parseFloat(form.altoMm)  || 38)),
    gap: 3,
  }
}

function getGridCols(form: LabelForm): number {
  if (form.template === 'pallet') return 1
  const sz  = SIZES[form.tamano]
  const lmm = getLabelMm(form)
  return Math.max(1, Math.floor((sz.mm.w - 20 + lmm.gap) / (lmm.w + lmm.gap)))
}

function getGridRows(form: LabelForm): number {
  if (form.template === 'pallet') return 1
  const sz  = SIZES[form.tamano]
  const lmm = getLabelMm(form)
  return Math.max(1, Math.floor((sz.mm.h - 20 + lmm.gap) / (lmm.h + lmm.gap)))
}

function labelsPerPage(form: LabelForm) { return getGridCols(form) * getGridRows(form) }

function getPreviewDims(form: LabelForm) {
  if (form.template === 'pallet') {
    const sz = SIZES[form.tamano]
    return { renderW: PREVIEW_W, renderH: Math.round(PREVIEW_W * sz.h / sz.w), scale: PREVIEW_W / sz.w, contentW: sz.w, contentH: sz.h }
  }
  const lmm      = getLabelMm(form)
  const PX       = 3.7795
  const contentW = Math.round(lmm.w * PX)
  const contentH = Math.round(lmm.h * PX)
  const scale    = SMALL_PREVIEW_W / contentW
  return { renderW: SMALL_PREVIEW_W, renderH: Math.round(contentH * scale), scale, contentW, contentH }
}

// ── Print CSS ──────────────────────────────────────────────────────
function printCSS(form: LabelForm): string {
  const sz   = SIZES[form.tamano]
  const cols = getGridCols(form)
  const lmm  = getLabelMm(form)

  if (form.template === 'pallet') {
    return `
@media screen { .print-labels { position:absolute; left:-9999px; top:0; } }
@media print {
  .print-labels { position:static!important; left:0!important; top:0!important; display:block!important; }
  .etiqueta { display:flex!important; flex-direction:column!important; width:100%!important;
               height:100vh!important; page-break-after:always!important; break-after:page!important;
               box-sizing:border-box!important; overflow:hidden!important; }
  .etiqueta:last-child { page-break-after:avoid!important; break-after:avoid!important; }
  @page { margin:0; size:${sz.page}; }
}`
  }

  return `
@media screen { .print-labels { position:absolute; left:-9999px; top:0; } }
@media print {
  .print-labels {
    position:static!important; left:0!important; top:0!important;
    display:grid!important;
    grid-template-columns: repeat(${cols}, ${lmm.w}mm)!important;
    gap:${lmm.gap}mm!important;
    padding:10mm!important;
    align-content:start!important;
    box-sizing:border-box!important;
  }
  .etiqueta-grid {
    width:${lmm.w}mm!important; height:${lmm.h}mm!important;
    overflow:hidden!important; box-sizing:border-box!important;
    break-inside:avoid!important; page-break-inside:avoid!important;
  }
  @page { margin:0; size:${sz.page}; }
}`
}

// ── Componente Pallet (la etiqueta actual, mejorada con fuente) ────
interface EtiquetaPalletProps {
  form: LabelForm; pallet: number; total: number; style: LabelStyle
  onDragStart?: (e: React.MouseEvent) => void
}

function EtiquetaPallet({ form, pallet, total, style, onDragStart }: EtiquetaPalletProps) {
  const palletText = total > 1 ? `PALLET ${pallet} DE ${total}` : 'PALLET ÚNICO'
  const fechaFmt   = form.fecha
    ? new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '—'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily: form.font, overflow:'hidden' }}>
      <div style={{ background:'#2E333A', color:'#fff', padding:'10px 18px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C" style={{ height:40, width:40, objectFit:'contain' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, letterSpacing:1.5, textTransform:'uppercase' }}>2C Montajes y Proyectos Eléctricos</div>
          <div style={{ fontSize:10, color:'#9BA3AE', marginTop:1 }}>Despacho de materiales y equipos de obra</div>
        </div>
        <div style={{ background:'#F0C000', color:'#1C1F24', padding:'6px 18px', borderRadius:6, fontWeight:900, fontSize:20, letterSpacing:1.5, whiteSpace:'nowrap', flexShrink:0 }}>
          {palletText}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'18px 32px', background:'#F8F9FA', borderLeft:'8px solid #F0C000', position:'relative', overflow:'hidden' }}>
        <div
          onMouseDown={onDragStart}
          style={{ position:'relative', top:style.offsetY, cursor: onDragStart ? 'grab' : 'default', userSelect:'none', textAlign:'center' }}
        >
          <div style={{ fontSize:11, fontWeight:700, color:'#9BA3AE', letterSpacing:4, marginBottom:10, textTransform:'uppercase' }}>Obra / Proyecto</div>
          <div style={{ fontSize:style.mainSize, fontWeight:900, color:'#2E333A', lineHeight:1.05, textTransform:'uppercase', wordBreak:'break-word' }}>
            {form.obra || '— SIN NOMBRE —'}
          </div>
        </div>
      </div>

      <div style={{ background:'#2E333A', color:'#E5E7EB', padding:'10px 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 28px', flexShrink:0 }}>
        <Cell label="OT"      value={form.ot      || '—'} fs={style.footerSize} />
        <Cell label="Cliente" value={form.cliente  || '—'} fs={style.footerSize} />
        <div style={{ gridColumn:'1 / -1' }}><Cell label="Pedido" value={form.pedido || '—'} fs={style.footerSize} /></div>
        <Cell label="Fecha"   value={fechaFmt}              fs={style.footerSize} small />
        {form.obs ? <Cell label="Obs." value={form.obs}     fs={style.footerSize} small highlight /> : <div />}
      </div>
    </div>
  )
}

function Cell({ label, value, small, highlight, fs }: { label:string; value:string; small?:boolean; highlight?:boolean; fs:number }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:5, flexWrap:'wrap' }}>
      <span style={{ color:'#F0C000', fontWeight:700, fontSize:10, letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>{label}:</span>
      <span style={{ fontSize: small ? Math.max(fs-1, 9) : fs, fontWeight:600, color: highlight ? '#FCD34D' : '#E5E7EB' }}>{value}</span>
    </div>
  )
}

// ── Componente Rack ────────────────────────────────────────────────
function EtiquetaRack({ form, style }: { form: LabelForm; style: LabelStyle }) {
  return (
    <div style={{ width:'100%', height:'100%', fontFamily:form.font, border:'1.5px solid #2E333A', display:'flex', flexDirection:'column', overflow:'hidden', boxSizing:'border-box' }}>
      <div style={{ background:'#2E333A', padding:'3px 8px', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C" style={{ height:14, width:14, objectFit:'contain' }} />
        <span style={{ fontSize:8, fontWeight:700, color:'#9BA3AE', letterSpacing:1.5, textTransform:'uppercase' }}>RACK / ESTANTE</span>
      </div>
      <div style={{ flex:1, padding:'4px 8px', display:'flex', flexDirection:'column', justifyContent:'center', background:'#F8F9FA', borderLeft:'4px solid #F0C000' }}>
        <div style={{ fontSize:style.mainSize, fontWeight:900, color:'#2E333A', lineHeight:1.1, wordBreak:'break-word' }}>
          {form.codigo || '— CÓDIGO —'}
        </div>
        {form.nombre && (
          <div style={{ fontSize:style.footerSize, color:'#4A5260', marginTop:2, fontWeight:600 }}>{form.nombre}</div>
        )}
        {form.detalle && (
          <div style={{ fontSize:Math.max(style.footerSize - 1, 7), color:'#909090', marginTop:1 }}>{form.detalle}</div>
        )}
      </div>
    </div>
  )
}

// ── Componente Cajón ───────────────────────────────────────────────
function EtiquetaCajon({ form, style }: { form: LabelForm; style: LabelStyle }) {
  return (
    <div style={{ width:'100%', height:'100%', fontFamily:form.font, border:'1.5px solid #2E333A', display:'flex', flexDirection:'column', overflow:'hidden', boxSizing:'border-box', background:'#fff' }}>
      <div style={{ background:'#2E333A', padding:'2px 6px', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C" style={{ height:10, width:10, objectFit:'contain' }} />
        <span style={{ fontSize:6, color:'#9BA3AE', letterSpacing:1, textTransform:'uppercase' }}>2C MONTAJES</span>
      </div>
      <div style={{ flex:1, padding:'3px 6px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontSize:style.mainSize, fontWeight:900, color:'#2E333A', lineHeight:1.1, borderBottom:'2px solid #F0C000', paddingBottom:2, wordBreak:'break-word' }}>
          {form.codigo || '—'}
        </div>
        {form.nombre && (
          <div style={{ fontSize:style.footerSize, color:'#2E333A', marginTop:2, fontWeight:600 }}>{form.nombre}</div>
        )}
        {form.detalle && (
          <div style={{ fontSize:Math.max(style.footerSize - 2, 6), color:'#909090' }}>{form.detalle}</div>
        )}
      </div>
    </div>
  )
}

// ── Componente Genérica ────────────────────────────────────────────
function EtiquetaGenerica({ form, style }: { form: LabelForm; style: LabelStyle }) {
  return (
    <div style={{ width:'100%', height:'100%', fontFamily:form.font, border:'1px solid #2E333A', display:'flex', flexDirection:'column', overflow:'hidden', boxSizing:'border-box' }}>
      <div style={{ background:'#2E333A', padding:'3px 8px', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-2c.png" alt="2C" style={{ height:13, width:13, objectFit:'contain' }} />
        <span style={{ fontSize:7, color:'#9BA3AE', letterSpacing:1.2, textTransform:'uppercase' }}>2C MONTAJES</span>
      </div>
      <div style={{ flex:1, padding:'5px 8px', display:'flex', flexDirection:'column', justifyContent:'center', background:'#F8F9FA', borderLeft:'4px solid #F0C000' }}>
        {form.codigo && (
          <div style={{ fontSize:style.mainSize, fontWeight:900, color:'#2E333A', lineHeight:1.1, wordBreak:'break-word' }}>{form.codigo}</div>
        )}
        {form.nombre && (
          <div style={{ fontSize:style.footerSize, color:'#2E333A', marginTop:2, fontWeight:600 }}>{form.nombre}</div>
        )}
        {form.descripcion && (
          <div style={{ fontSize:Math.max(style.footerSize - 1, 7), color:'#4A5260', marginTop:1 }}>{form.descripcion}</div>
        )}
      </div>
    </div>
  )
}

// ── Etiqueta dispatch ──────────────────────────────────────────────
function LabelContent({ form, style, pallet, total, onDragStart }: {
  form: LabelForm; style: LabelStyle; pallet?: number; total?: number
  onDragStart?: (e: React.MouseEvent) => void
}) {
  if (form.template === 'pallet')  return <EtiquetaPallet  form={form} pallet={pallet ?? 1} total={total ?? 1} style={style} onDragStart={onDragStart} />
  if (form.template === 'rack')    return <EtiquetaRack    form={form} style={style} />
  if (form.template === 'cajon')   return <EtiquetaCajon   form={form} style={style} />
  return <EtiquetaGenerica form={form} style={style} />
}

// ── Slider ─────────────────────────────────────────────────────────
function StyleSlider({ label, value, min, max, step = 1, unit = 'px', onChange }: {
  label:string; value:number; min:number; max:number; step?:number; unit?:string
  onChange:(v:number)=>void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-mono text-slate-500">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor:'#F0C000' }} />
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────
export default function GeneradorEtiquetas({ proyectos }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const makeDefault = useCallback((): LabelForm => ({
    obra:'', ot:'', cliente:'', pedido:'', fecha:today, bultos:'1', obs:'',
    codigo:'', nombre:'', descripcion:'', detalle:'', cantidad:'1',
    anchoMm:'63', altoMm:'38',
    tamano:'a4l', template:'pallet', font:'Arial, Helvetica, sans-serif',
  }), [today])

  const [proyId,     setProyId]     = useState('')
  const [form,       setForm]       = useState<LabelForm>(makeDefault)
  const [labelStyle, setLabelStyle] = useState<LabelStyle>(STYLE_DEFAULTS.pallet)

  // ── Drag (solo pallet) ─────────────────────────────────────────
  const dragRef   = useRef<{ startY:number; startOffset:number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startOffset: labelStyle.offsetY }
  }, [labelStyle.offsetY])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const sz      = SIZES[form.tamano]
      const scale   = PREVIEW_W / sz.w
      const delta   = (e.clientY - dragRef.current.startY) / scale
      const maxOff  = sz.h * 0.28
      setLabelStyle(s => ({ ...s, offsetY: Math.round(Math.max(-maxOff, Math.min(maxOff, dragRef.current!.startOffset + delta))) }))
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
    else   setForm(f => ({ ...f, obra:'', ot:'', cliente:'' }))
  }

  const handleTemplate = (t: TemplateId) => {
    const defaultTamano = SHEET_OPTIONS[t][0]
    setForm(f => ({ ...f, template: t, tamano: defaultTamano }))
    setLabelStyle(STYLE_DEFAULTS[t])
  }

  const reset = () => { setProyId(''); setForm(makeDefault()); setLabelStyle(STYLE_DEFAULTS.pallet) }

  // ── Cálculos de cantidad / grilla ──────────────────────────────
  const total    = form.template === 'pallet'
    ? Math.max(1, Math.min(20,  parseInt(form.bultos)   || 1))
    : Math.max(1, Math.min(200, parseInt(form.cantidad) || 1))
  const pallets  = Array.from({ length: total }, (_, i) => i + 1)
  const pp       = labelsPerPage(form)
  const gridCols = getGridCols(form)
  const prev     = getPreviewDims(form)
  const ranges   = STYLE_RANGES[form.template]

  const printLabel = () => window.print()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS(form) }} />

      {/* ── PANTALLA ──────────────────────────────────────────────── */}
      <div className="no-print p-5 max-w-[1400px]">

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Tag size={18} style={{ color:'#2E333A' }} />
          <div>
            <h1 className="text-lg font-bold text-slate-800">Etiquetas de obra</h1>
            <p className="text-xs text-slate-400">
              {form.template === 'pallet'
                ? 'Pallets y bultos — una etiqueta por página'
                : `Grilla ${gridCols} × ${getGridRows(form)} = ${pp} etiquetas por hoja`}
            </p>
          </div>
          <button onClick={printLabel} className="btn btn-primary ml-auto">
            <Printer size={14} />
            {form.template === 'pallet'
              ? (total > 1 ? `Imprimir ${total} etiquetas` : 'Imprimir etiqueta')
              : `Imprimir ${total} etiqueta${total !== 1 ? 's' : ''} (${Math.ceil(total / pp)} hoja${Math.ceil(total / pp) !== 1 ? 's' : ''})`}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ── COLUMNA IZQ ──────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Selector de plantilla */}
            <div className="panel">
              <div className="panel-header">
                <LayoutGrid size={13} style={{ color:'#909090' }} />
                <h2>Tipo de etiqueta</h2>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {(['pallet','rack','cajon','generica'] as TemplateId[]).map(t => (
                  <button key={t} onClick={() => handleTemplate(t)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border
                      ${form.template === t
                        ? 'border-amber-400 bg-amber-50 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    {t === 'pallet'  && '📦 '}
                    {t === 'rack'    && '🗄️ '}
                    {t === 'cajon'   && '🗃️ '}
                    {t === 'generica'&& '✏️ '}
                    {TEMPLATE_LABELS[t]}
                    {t !== 'pallet' && (
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                        {t === 'rack'   && '95 × 45 mm'}
                        {t === 'cajon'  && '63 × 38 mm'}
                        {t === 'generica' && 'tamaño libre'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario */}
            <div className="panel">
              <div className="panel-header">
                <Tag size={13} style={{ color:'#909090' }} />
                <h2>Datos de la etiqueta</h2>
                <button onClick={reset} className="btn btn-ghost btn-sm ml-auto"><RotateCcw size={12} /> Limpiar</button>
              </div>
              <div className="p-4 space-y-3">

                {/* Pallet fields */}
                {form.template === 'pallet' && (
                  <>
                    {proyectos.length > 0 && (
                      <div>
                        <label className="label">Autocompletar desde OT activa</label>
                        <select className="select" value={proyId} onChange={e => handleProy(e.target.value)}>
                          <option value="">— Seleccionar proyecto —</option>
                          {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
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
                      <input className="input" placeholder="Tablero TG-01 / Materiales electrobarra" value={form.pedido} onChange={set('pedido')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Fecha</label>
                        <input className="input" type="date" value={form.fecha} onChange={set('fecha')} />
                      </div>
                      <div>
                        <label className="label">Observaciones</label>
                        <input className="input" placeholder="Frágil — vidrio" value={form.obs} onChange={set('obs')} />
                      </div>
                    </div>
                  </>
                )}

                {/* Rack / Cajón / Genérica fields */}
                {form.template !== 'pallet' && (
                  <>
                    <div>
                      <label className="label">Código (texto principal) *</label>
                      <input className="input" placeholder={
                        form.template === 'rack'    ? 'Ej: RACK-A01' :
                        form.template === 'cajon'   ? 'Ej: C-001' : 'Ej: EST-12'
                      } value={form.codigo} onChange={set('codigo')} />
                    </div>
                    <div>
                      <label className="label">
                        {form.template === 'rack'    ? 'Descripción de ubicación' :
                         form.template === 'cajon'   ? 'Nombre del cajón / contenido' : 'Nombre'}
                      </label>
                      <input className="input" placeholder={
                        form.template === 'rack'    ? 'Ej: Estante A · Piso 1' :
                        form.template === 'cajon'   ? 'Ej: Tornillos M6' : 'Ej: Herramientas menores'
                      } value={form.nombre} onChange={set('nombre')} />
                    </div>
                    {(form.template === 'cajon' || form.template === 'generica') && (
                      <div>
                        <label className="label">Detalle adicional (opcional)</label>
                        <input className="input" placeholder="Ej: × 25mm · Caja 100 un." value={form.detalle} onChange={set('detalle')} />
                      </div>
                    )}
                    {form.template === 'generica' && (
                      <div>
                        <label className="label">Descripción (opcional)</label>
                        <input className="input" placeholder="Descripción larga…" value={form.descripcion} onChange={set('descripcion')} />
                      </div>
                    )}
                    {form.template === 'generica' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Ancho etiqueta (mm)</label>
                          <input className="input" type="number" min="30" max="200" value={form.anchoMm} onChange={set('anchoMm')} />
                        </div>
                        <div>
                          <label className="label">Alto etiqueta (mm)</label>
                          <input className="input" type="number" min="20" max="200" value={form.altoMm} onChange={set('altoMm')} />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Cantidad de etiquetas</label>
                        <input className="input" type="number" min="1" max="200" value={form.cantidad} onChange={set('cantidad')} />
                      </div>
                      <div className="pt-4">
                        <span className="text-xs text-slate-500">
                          → {pp} por hoja · {Math.ceil(total / pp)} hoja{Math.ceil(total / pp) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Tamaño de hoja — siempre visible */}
                <div>
                  <label className="label">Tamaño de hoja</label>
                  <select className="select" value={form.tamano} onChange={set('tamano')}>
                    {SHEET_OPTIONS[form.template].map(k => (
                      <option key={k} value={k}>{SHEET_LABELS[k]}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Editor de apariencia */}
            <div className="panel">
              <div className="panel-header">
                <Sliders size={13} style={{ color:'#909090' }} />
                <h2>Apariencia</h2>
                <button onClick={() => setLabelStyle(STYLE_DEFAULTS[form.template])}
                  className="btn btn-ghost btn-sm ml-auto text-xs">
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
              <div className="p-4 space-y-4">

                {/* Fuente tipográfica */}
                <div>
                  <label className="label">Tipografía</label>
                  <select className="select text-xs" value={form.font} onChange={set('font')}>
                    {FONTS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
                  </select>
                </div>

                <StyleSlider
                  label={form.template === 'pallet' ? 'Tamaño nombre de obra' : 'Tamaño del código'}
                  value={labelStyle.mainSize}
                  min={ranges.mainMin} max={ranges.mainMax} step={2}
                  onChange={v => setLabelStyle(s => ({ ...s, mainSize: v }))}
                />

                {form.template === 'pallet' && (
                  <StyleSlider
                    label="Posición vertical del nombre"
                    value={labelStyle.offsetY}
                    min={-150} max={150} step={5} unit="px"
                    onChange={v => setLabelStyle(s => ({ ...s, offsetY: v }))}
                  />
                )}

                <StyleSlider
                  label={form.template === 'pallet' ? 'Tamaño texto footer' : 'Tamaño descripción'}
                  value={labelStyle.footerSize}
                  min={ranges.footerMin} max={ranges.footerMax} step={1}
                  onChange={v => setLabelStyle(s => ({ ...s, footerSize: v }))}
                />

                {form.template === 'pallet' && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    También puedes arrastrar el nombre en la vista previa para reposicionarlo.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* ── VISTA PREVIA ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Vista previa
              {form.template === 'pallet' && (
                <span className="ml-2 normal-case font-normal text-[10px]">
                  · Pallet 1 de {total} · (lo que ves es lo que se imprime)
                </span>
              )}
              {form.template !== 'pallet' && (
                <span className="ml-2 normal-case font-normal text-[10px]">
                  · 1 etiqueta de {total} · {gridCols} col × {getGridRows(form)} fil por hoja
                </span>
              )}
            </p>

            <div
              ref={previewRef}
              style={{
                width: prev.renderW, height: prev.renderH,
                overflow: 'hidden', borderRadius: 8,
                boxShadow: '0 6px 32px rgba(0,0,0,0.22)',
                cursor: 'default',
                background: form.template !== 'pallet' ? '#f0f0f0' : undefined,
              }}
            >
              <div style={{ width: prev.contentW, height: prev.contentH, transform: `scale(${prev.scale})`, transformOrigin:'top left' }}>
                <LabelContent
                  form={form} style={labelStyle}
                  pallet={1} total={total}
                  onDragStart={form.template === 'pallet' ? handleDragStart : undefined}
                />
              </div>
            </div>

            {/* Info impresión */}
            {form.template === 'pallet' && total > 1 && (
              <p className="text-xs text-slate-400 mt-2">
                Al imprimir se generarán <strong>{total} páginas</strong>, una por cada pallet.
              </p>
            )}
            {form.template !== 'pallet' && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1">
                <p><strong className="text-slate-700">Tamaño:</strong>{' '}
                  {form.template === 'generica'
                    ? `${form.anchoMm} × ${form.altoMm} mm (configurable)`
                    : `${getLabelMm(form).w} × ${getLabelMm(form).h} mm`}
                </p>
                <p><strong className="text-slate-700">Hoja:</strong> {SHEET_LABELS[form.tamano]}</p>
                <p><strong className="text-slate-700">Grilla:</strong> {gridCols} col × {getGridRows(form)} fil = {pp} etiquetas por hoja</p>
                <p><strong className="text-slate-700">Total a imprimir:</strong> {total} etiquetas en {Math.ceil(total / pp)} hoja{Math.ceil(total / pp) !== 1 ? 's' : ''}</p>
                <p className="text-[10px] text-slate-400 pt-1">Las líneas punteadas son guías de corte — no se imprimen en impresoras sin margen.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ÁREA DE IMPRESIÓN ─────────────────────────────────────── */}
      <div aria-hidden>
        <div className="print-labels">
          {pallets.map(n => (
            form.template === 'pallet'
              ? (
                <div key={n} className="etiqueta">
                  <LabelContent form={form} style={labelStyle} pallet={n} total={total} />
                </div>
              )
              : (
                <div key={n} className="etiqueta-grid">
                  <LabelContent form={form} style={labelStyle} />
                </div>
              )
          ))}
        </div>
      </div>
    </>
  )
}
