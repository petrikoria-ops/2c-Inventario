'use client'
import { useState, useMemo } from 'react'
import {
  Calculator, Zap, Thermometer, Layers, Wrench,
  BookOpen, Search, AlertTriangle, ExternalLink, Info,
  CheckSquare, Plug, Lock,
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────

const CONDUCTORES_AMPACIDAD = [
  { sec: '1.5',  awg: '16',     amp: 15,  uso: 'Iluminación, tomas livianas' },
  { sec: '2.5',  awg: '14',     amp: 21,  uso: 'Tomas de uso general, calefacción' },
  { sec: '4',    awg: '12',     amp: 28,  uso: 'Cocinas, climatizadores pequeños' },
  { sec: '6',    awg: '10',     amp: 36,  uso: 'Climatizadores medianos, cocinas industriales' },
  { sec: '10',   awg: '8',      amp: 50,  uso: 'Alimentadores monofásicos, equipos industriales' },
  { sec: '16',   awg: '6',      amp: 66,  uso: 'Alimentadores, motores medianos' },
  { sec: '25',   awg: '4',      amp: 88,  uso: 'Alimentadores trifásicos, motores grandes' },
  { sec: '35',   awg: '2',      amp: 110, uso: 'Alimentadores principales' },
  { sec: '50',   awg: '1/0',    amp: 133, uso: 'Alimentadores de tablero secundario' },
  { sec: '70',   awg: '2/0',    amp: 171, uso: 'Alimentadores principales, acometidas' },
  { sec: '95',   awg: '3/0',    amp: 207, uso: 'Acometidas industriales' },
]

const CONVERSION_MM2_AWG = [
  { mm2: '0.5',  awg: '20' }, { mm2: '0.75', awg: '18' }, { mm2: '1.0',  awg: '17' },
  { mm2: '1.5',  awg: '16' }, { mm2: '2.5',  awg: '14' }, { mm2: '4',    awg: '12' },
  { mm2: '6',    awg: '10' }, { mm2: '10',   awg: '8'  }, { mm2: '16',   awg: '6'  },
  { mm2: '25',   awg: '4'  }, { mm2: '35',   awg: '2'  }, { mm2: '50',   awg: '1/0'},
  { mm2: '70',   awg: '2/0'}, { mm2: '95',   awg: '3/0'}, { mm2: '120',  awg: '250 MCM' },
  { mm2: '150',  awg: '300 MCM' }, { mm2: '185', awg: '350 MCM' }, { mm2: '240', awg: '500 MCM' },
]

const TERMOCONTRAIBLES = [
  { exp: 1.6,  cont: 0.8,  rango: '< 0.8 mm' },
  { exp: 2.4,  cont: 1.2,  rango: '0.8 – 1.2 mm' },
  { exp: 3.2,  cont: 1.6,  rango: '1.2 – 1.6 mm' },
  { exp: 4.8,  cont: 2.4,  rango: '1.6 – 2.4 mm' },
  { exp: 6.4,  cont: 3.2,  rango: '2.4 – 3.2 mm' },
  { exp: 9.5,  cont: 4.8,  rango: '3.2 – 4.8 mm' },
  { exp: 12.7, cont: 6.4,  rango: '4.8 – 6.4 mm' },
  { exp: 19,   cont: 9.5,  rango: '6.4 – 9.5 mm' },
  { exp: 25.4, cont: 12.7, rango: '9.5 – 12.7 mm' },
  { exp: 38,   cont: 19,   rango: '12.7 – 19 mm' },
  { exp: 51,   cont: 25.5, rango: '19 – 25.5 mm' },
]

const CANALIZACIONES = [
  { Icon: Wrench,  tipo: 'Conduit metálico EMT / rígido',    desc: 'Tubería de acero galvanizado. Alta resistencia mecánica.',                cuando: 'Instalaciones a la vista, superficies expuestas, exterior, donde se requiere protección ante golpes.' },
  { Icon: Plug,    tipo: 'Tubería PVC / conduit plástico',   desc: 'Liviana, resistente a la corrosión y humedad.',                            cuando: 'Interiores, ambientes húmedos o corrosivos, empotrado en pared, uso general.' },
  { Icon: Layers,  tipo: 'Tubería flexible / corrugada',     desc: 'Permite curvas estrechas y absorbe vibraciones.',                          cuando: 'Conexión final a equipos, tramos con movimiento o vibración, salidas de tablero.' },
  { Icon: Layers,  tipo: 'Bandeja portacables',              desc: 'Estructura abierta metálica o plástica para soporte de cables.',            cuando: 'Tendidos de muchos cables en paralelo, salas de máquinas, ambientes industriales.' },
  { Icon: Layers,  tipo: 'Escalerilla portacables',          desc: 'Dos largueros unidos por peldaños. Máxima ventilación.',                   cuando: 'Cables de potencia en tramos largos donde la disipación de calor es crítica.' },
  { Icon: Layers,  tipo: 'Canastillo / bandeja de malla',    desc: 'Malla de alambre soldado. Muy liviana y flexible en recorrido.',            cuando: 'Cableado de control y señales livianas, data centers, oficinas.' },
  { Icon: Layers,  tipo: 'Canaleta plástica con tapa',       desc: 'Plástico con tapa removible. Aspecto limpio y ordenado.',                  cuando: 'Instalaciones a la vista en oficinas o recintos de atención al público.' },
  { Icon: Layers,  tipo: 'Ducto ranurado',                   desc: 'Canaleta ranurada diseñada para organizar cables internamente.',            cuando: 'Interior de tableros eléctricos, ordenamiento de cableado de control y bornes.' },
]

const PERNERIA_METRICO = [
  { rosca: 'M4',  corriente: 0.70, fino: 0.50, llave: 7  },
  { rosca: 'M5',  corriente: 0.80, fino: 0.50, llave: 8  },
  { rosca: 'M6',  corriente: 1.00, fino: 0.75, llave: 10 },
  { rosca: 'M8',  corriente: 1.25, fino: 1.00, llave: 13 },
  { rosca: 'M10', corriente: 1.50, fino: 1.25, llave: 17 },
  { rosca: 'M12', corriente: 1.75, fino: 1.25, llave: 19 },
  { rosca: 'M14', corriente: 2.00, fino: 1.50, llave: 22 },
  { rosca: 'M16', corriente: 2.00, fino: 1.50, llave: 24 },
  { rosca: 'M20', corriente: 2.50, fino: 1.50, llave: 30 },
]

const PERNERIA_PULGADAS = [
  { pulgada: '1/8"',  mm: 3.2  },
  { pulgada: '3/16"', mm: 4.8  },
  { pulgada: '1/4"',  mm: 6.35 },
  { pulgada: '5/16"', mm: 7.9  },
  { pulgada: '3/8"',  mm: 9.5  },
  { pulgada: '1/2"',  mm: 12.7 },
  { pulgada: '5/8"',  mm: 15.9 },
  { pulgada: '3/4"',  mm: 19.1 },
]

const CATALOGOS = [
  { label: 'Legrand — Catálogos',    href: 'https://www.legrand.cl/es/centros-de-descargas/catalogos' },
  { label: 'Legrand — e-Catálogo',   href: 'https://www.legrand.cl/es/centros-de-descargas/e-cat-pagina-principal' },
  { label: 'Chint — Catálogos',      href: 'https://chint.cl/content/12-catalogos-y-manuales' },
]

// ─── Calculators ──────────────────────────────────────────────────────
// Caída de tensión: monofásico usa el factor 2 (ida y vuelta por el mismo
// conductor); trifásico usa √3 (corriente de línea, tensión entre fases).
// Antes se usaba siempre 2, lo que sobre-dimensiona en trifásico pero no
// coincide con la fórmula oficial RIC para ese caso.
const RHO = 0.0172
function calcCaida(v:number,i:number,l:number,s:number,tri:boolean){const factor=tri?Math.sqrt(3):2;const dV=(factor*RHO*l*i)/s;const pct=(dV/v)*100;return{dV,pct,ok:pct<=3}}
function seccionMin(i:number,l:number,pct:number,v:number,tri:boolean){const factor=tri?Math.sqrt(3):2;const dVmax=v*(pct/100);const s=(factor*RHO*l*i)/dVmax;const n=[1.5,2.5,4,6,10,16,25,35,50,70,95,120];return{s,elegido:n.find(x=>x>=s)??n[n.length-1]}}
function calcBreaker(p:number,v:number,fp:number,fs:number,tri:boolean){const In=tri?p/(Math.sqrt(3)*v*fp):p/(v*fp);const Ib=In*fs;const n=[6,10,16,20,25,32,40,50,63,80,100,125,160,200,250];return{In,Ib,breaker:n.find(x=>x>=Ib)??n[n.length-1]}}

// ─── Tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'calc',    label: 'Calculadoras',    Icon: Calculator  },
  { id: 'cond',    label: 'Conductores',     Icon: Zap         },
  { id: 'termo',   label: 'Termocontraíbles',Icon: Thermometer },
  { id: 'canal',   label: 'Canalizaciones',  Icon: Layers      },
  { id: 'pern',    label: 'Pernería',        Icon: Wrench      },
  { id: 'norma',   label: 'Normativa',       Icon: BookOpen    },
] as const
type TabId = typeof TABS[number]['id']

// ═══════════════════════════════════════════════════════════════════════
export default function RecursosPage() {
  const [tab, setTab]   = useState<TabId>('calc')

  // Calculator states
  const [ct, setCt]   = useState({ v:220, i:20, l:50, s:2.5, tri:false })
  const [ctR, setCtR] = useState<ReturnType<typeof calcCaida>|null>(null)
  const [sc, setSc]   = useState({ i:30, l:30, pct:3, v:220, tri:false })
  const [scR, setScR] = useState<ReturnType<typeof seccionMin>|null>(null)
  const [dp, setDp]   = useState({ p:5000, v:220, fp:0.85, fs:1.25, tri:false })
  const [dpR, setDpR] = useState<ReturnType<typeof calcBreaker>|null>(null)

  // Search states
  const [qCond, setQCond] = useState('')
  const [qPern, setQPern] = useState('')

  const filtAmp = useMemo(()=>{
    const q=qCond.toLowerCase()
    if(!q) return CONDUCTORES_AMPACIDAD
    return CONDUCTORES_AMPACIDAD.filter(r=>r.sec.includes(q)||r.awg.toLowerCase().includes(q)||String(r.amp).includes(q)||r.uso.toLowerCase().includes(q))
  },[qCond])

  const filtConv = useMemo(()=>{
    const q=qCond.toLowerCase()
    if(!q) return CONVERSION_MM2_AWG
    return CONVERSION_MM2_AWG.filter(r=>r.mm2.includes(q)||r.awg.toLowerCase().includes(q))
  },[qCond])

  const filtPernM = useMemo(()=>{
    const q=qPern.toLowerCase()
    if(!q) return PERNERIA_METRICO
    return PERNERIA_METRICO.filter(r=>r.rosca.toLowerCase().includes(q)||String(r.llave).includes(q))
  },[qPern])

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Calculator size={18} style={{ color: '#2E333A' }} />
        <h1 className="text-lg font-bold text-slate-800">Recursos Técnicos</h1>
        <a href="/checklist" target="_blank" rel="noopener"
          className="btn btn-outline btn-sm ml-auto">
          <CheckSquare size={13} /> Checklist tablero
        </a>
      </div>

      {/* Tab nav */}
      <div className="flex gap-0.5 flex-wrap mb-5 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md -mb-px border-b-2 transition-all
              ${tab === t.id
                ? 'border-[#F0C000] text-[#2E333A] bg-amber-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            <t.Icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* ── CALCULADORAS ───────────────────────────────────────── */}
      {tab === 'calc' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Caída de tensión */}
          <div className="panel p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={14} style={{ color: '#D97706' }} />
              <h3 className="font-semibold text-slate-700">Caída de tensión</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                {label:'Tensión (V)',    key:'v', type:'select', opts:[220,380]},
                {label:'Corriente (A)', key:'i', type:'number'},
                {label:'Longitud (m)',  key:'l', type:'number'},
                {label:'Sección (mm²)', key:'s', type:'select', opts:[1.5,2.5,4,6,10,16,25,35,50,70]},
              ].map(f=>(
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  {f.type==='select'
                    ? <select className="select text-xs" value={(ct as any)[f.key]} onChange={e=>{
                        const v = parseFloat(e.target.value)
                        setCt(p=>({...p,[f.key]:v, ...(f.key==='v' ? { tri: v===380 } : {})}))
                      }}>
                        {f.opts!.map(o=><option key={o}>{o}</option>)}
                      </select>
                    : <input type="number" className="input text-xs" value={(ct as any)[f.key]} onChange={e=>setCt(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />}
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
              <input type="checkbox" checked={ct.tri} onChange={e=>setCt(p=>({...p,tri:e.target.checked}))} className="accent-blue-700" />
              Sistema trifásico (√3 × V) — se marca solo al elegir 380V
            </label>
            <button className="btn btn-primary btn-sm w-full mb-2" onClick={()=>setCtR(calcCaida(ct.v,ct.i,ct.l,ct.s,ct.tri))}>Calcular</button>
            {ctR && (
              <div className={`rounded-lg px-3 py-2 text-sm font-medium text-center ${ctR.ok?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>
                ΔV = {ctR.dV.toFixed(2)} V ({ctR.pct.toFixed(2)}%) — {ctR.ok?'Dentro del límite':'Excede 3%'}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">ρ cobre = 0.0172 Ω·mm²/m | Factor {ct.tri?'√3 (trifásico)':'2 (monofásico)'} | Límite RIC ≤ 3%</p>
          </div>

          {/* Sección mínima */}
          <div className="panel p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Plug size={14} style={{ color: '#2563EB' }} />
              <h3 className="font-semibold text-slate-700">Sección mínima de conductor</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                {label:'Corriente (A)',   key:'i'},
                {label:'Longitud (m)',    key:'l'},
                {label:'Caída máx. (%)', key:'pct'},
                {label:'Tensión (V)',     key:'v'},
              ].map(f=>(
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input type="number" className="input text-xs" value={(sc as any)[f.key]} onChange={e=>setSc(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
              <input type="checkbox" checked={sc.tri} onChange={e=>setSc(p=>({...p,tri:e.target.checked}))} className="accent-blue-700" />
              Sistema trifásico (√3 × V)
            </label>
            <button className="btn btn-primary btn-sm w-full mb-2" onClick={()=>setScR(seccionMin(sc.i,sc.l,sc.pct,sc.v,sc.tri))}>Calcular</button>
            {scR && (
              <div className="bg-blue-50 text-blue-800 rounded-lg px-3 py-2 text-sm font-medium text-center">
                S mín. = {scR.s.toFixed(2)} mm² → usar <strong>{scR.elegido} mm²</strong>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">S = ({sc.tri?'√3':'2'} × ρ × L × I) / ΔV<sub>máx</sub></p>
          </div>

          {/* Dimensionar protección */}
          <div className="panel p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Lock size={14} style={{ color: '#7C3AED' }} />
              <h3 className="font-semibold text-slate-700">Dimensionar protección</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                {label:'Potencia (W)',    key:'p'},
                {label:'Tensión (V)',     key:'v'},
                {label:'Factor potencia',key:'fp'},
                {label:'Factor servicio',key:'fs'},
              ].map(f=>(
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input type="number" className="input text-xs" step="0.01" value={(dp as any)[f.key]} onChange={e=>setDp(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
              <input type="checkbox" checked={dp.tri} onChange={e=>setDp(p=>({...p,tri:e.target.checked}))} className="accent-blue-700" />
              Sistema trifásico (√3 × V)
            </label>
            <button className="btn btn-primary btn-sm w-full mb-2" onClick={()=>setDpR(calcBreaker(dp.p,dp.v,dp.fp,dp.fs,dp.tri))}>Calcular</button>
            {dpR && (
              <div className="bg-blue-50 text-blue-800 rounded-lg px-3 py-2 text-sm font-medium text-center">
                I<sub>n</sub>={dpR.In.toFixed(1)} A · I<sub>diseño</sub>={dpR.Ib.toFixed(1)} A<br />
                Interruptor: <strong>{dpR.breaker} A</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONDUCTORES ───────────────────────────────────────── */}
      {tab === 'cond' && (
        <div className="space-y-4">
          <div className="alert" style={{ background:'rgba(240,192,0,.1)', border:'1px solid rgba(240,192,0,.4)', borderRadius:8, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
            <AlertTriangle size={15} style={{ color:'#D97706', flexShrink:0, marginTop:1 }} />
            <p className="text-sm text-amber-900">
              <strong>Valores referenciales</strong> — cobre THW/THHN, aislación 75°C, 2–3 conductores en ducto, 30°C ambiente.
              La ampacidad oficial se rige por el <strong>RIC N°04</strong> y sus factores de corrección (temperatura, agrupamiento, tipo de instalación). Verifique siempre.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'#BBBBBB' }} />
              <input className="input w-56 pl-8" placeholder="Filtrar mm², AWG, A, uso…" value={qCond} onChange={e=>setQCond(e.target.value)} />
            </div>
            {qCond && <button className="btn btn-ghost btn-sm" onClick={()=>setQCond('')}>× Limpiar</button>}
          </div>

          <div className="panel">
            <div className="panel-header">
              <Zap size={14} style={{ color:'#D97706', flexShrink:0 }} />
              <h2>Ampacidad referencial — cobre</h2>
              <span className="text-xs text-slate-400 ml-auto">{filtAmp.length} fila(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="th">Sección (mm²)</th>
                  <th className="th">AWG aprox.</th>
                  <th className="th text-right">Ampacidad ref. (A)</th>
                  <th className="th">Uso típico</th>
                </tr></thead>
                <tbody>
                  {filtAmp.map(r=>(
                    <tr key={r.sec} className="tr-hover">
                      <td className="td"><span className="code font-bold">{r.sec} mm²</span></td>
                      <td className="td text-slate-500">{r.awg} AWG</td>
                      <td className="td text-right">
                        <span className="font-bold text-base" style={{ color:'#2E333A' }}>{r.amp}</span>
                        <span className="text-xs text-slate-400 ml-1">A</span>
                      </td>
                      <td className="td text-slate-600 text-sm">{r.uso}</td>
                    </tr>
                  ))}
                  {!filtAmp.length && <tr><td colSpan={4} className="text-center py-6 text-slate-400">Sin resultados</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <Zap size={14} style={{ color:'#909090', flexShrink:0 }} />
              <h2>Conversión mm² ↔ AWG (estándar más cercano)</h2>
              <span className="text-xs text-slate-400 ml-auto">{filtConv.length} fila(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="th">mm²</th>
                  <th className="th">AWG / MCM equivalente</th>
                </tr></thead>
                <tbody>
                  {filtConv.map(r=>(
                    <tr key={r.mm2} className="tr-hover">
                      <td className="td"><span className="code">{r.mm2} mm²</span></td>
                      <td className="td font-medium text-slate-700">{r.awg}</td>
                    </tr>
                  ))}
                  {!filtConv.length && <tr><td colSpan={2} className="text-center py-6 text-slate-400">Sin resultados</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TERMOCONTRAÍBLES ──────────────────────────────────── */}
      {tab === 'termo' && (
        <div className="space-y-4 max-w-3xl">
          <div className="alert" style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
            <Info size={15} style={{ color:'#2563EB', flexShrink:0, marginTop:1 }} />
            <div className="text-sm text-blue-900">
              <strong>Cómo elegir el tamaño correcto:</strong> mide el <strong>diámetro exterior del cable</strong>
              (conductor + aislación), no solo la sección. Elige un termocontraíble cuyo Ø <em>contraído</em> sea
              menor que el Ø del cable y cuyo Ø <em>expandido</em> sea mayor, para que pueda instalarse y ajuste bien.
              Ratio estándar: <strong>2:1</strong>.
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <Thermometer size={14} style={{ color:'#DC2626', flexShrink:0 }} />
              <h2>Termocontraíbles estándar — ratio 2:1</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className="th text-right">Ø expandido (mm)</th>
                  <th className="th text-right">Ø contraído (mm)</th>
                  <th className="th">Rango de cable que cubre</th>
                  <th className="th">Nota de selección</th>
                </tr></thead>
                <tbody>
                  {TERMOCONTRAIBLES.map(r=>(
                    <tr key={r.exp} className="tr-hover">
                      <td className="td text-right font-bold" style={{ color:'#2E333A' }}>{r.exp}</td>
                      <td className="td text-right text-slate-500">{r.cont}</td>
                      <td className="td"><span className="badge badge-blue">{r.rango}</span></td>
                      <td className="td text-xs text-slate-500">Cable Ø entre {r.cont} y {r.exp} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CANALIZACIONES ────────────────────────────────────── */}
      {tab === 'canal' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2">Guía de selección de canalizaciones eléctricas.</p>
          <div className="panel overflow-x-auto">
            <div className="panel-header">
              <Layers size={14} style={{ color:'#909090', flexShrink:0 }} />
              <h2>Tipos de canalizaciones</h2>
            </div>
            <table className="w-full">
              <thead><tr>
                <th className="th">Tipo</th>
                <th className="th">Descripción</th>
                <th className="th">Cuándo usarla</th>
              </tr></thead>
              <tbody>
                {CANALIZACIONES.map(c=>(
                  <tr key={c.tipo} className="tr-hover align-top">
                    <td className="td whitespace-nowrap">
                      <span className="font-semibold text-slate-800 text-sm">{c.tipo}</span>
                    </td>
                    <td className="td text-slate-600 text-sm">{c.desc}</td>
                    <td className="td text-slate-600 text-sm">{c.cuando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PERNERÍA ──────────────────────────────────────────── */}
      {tab === 'pern' && (
        <div className="space-y-4">
          <div className="alert" style={{ background:'rgba(240,192,0,.08)', border:'1px solid rgba(240,192,0,.4)', borderRadius:8, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
            <Info size={15} style={{ color:'#D97706', flexShrink:0, marginTop:1 }} />
            <p className="text-sm text-amber-900">
              <strong>Hilo corriente (grueso):</strong> paso de rosca mayor, montaje rápido, uso general en estructuras.
              <span className="mx-2">·</span>
              <strong>Hilo fino:</strong> paso de rosca menor, mayor número de filetes por pulgada, mejor agarre y resistencia a la vibración. Se usa en ajustes finos, elementos que se desmontan frecuentemente y en aplicaciones de alta precisión.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'#BBBBBB' }} />
              <input className="input w-52 pl-8" placeholder="Filtrar rosca o llave (mm)…" value={qPern} onChange={e=>setQPern(e.target.value)} />
            </div>
            {qPern && <button className="btn btn-ghost btn-sm" onClick={()=>setQPern('')}>× Limpiar</button>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Métrico */}
            <div className="panel">
              <div className="panel-header">
                <Wrench size={14} style={{ color:'#909090', flexShrink:0 }} />
                <h2>Pernería métrica</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="th">Rosca</th>
                    <th className="th text-right">Paso hilo corriente (mm)</th>
                    <th className="th text-right">Paso hilo fino (mm)</th>
                    <th className="th text-right">Llave / tuerca (mm)</th>
                  </tr></thead>
                  <tbody>
                    {filtPernM.map(r=>(
                      <tr key={r.rosca} className="tr-hover">
                        <td className="td"><span className="code font-bold">{r.rosca}</span></td>
                        <td className="td text-right text-slate-700">{r.corriente.toFixed(2)}</td>
                        <td className="td text-right text-slate-500">{r.fino.toFixed(2)}</td>
                        <td className="td text-right font-bold" style={{ color:'#2E333A' }}>{r.llave}</td>
                      </tr>
                    ))}
                    {!filtPernM.length && <tr><td colSpan={4} className="text-center py-6 text-slate-400">Sin resultados</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pulgadas */}
            <div className="panel">
              <div className="panel-header">
                <Wrench size={14} style={{ color:'#909090', flexShrink:0 }} />
                <h2>Equivalencia pulgadas ↔ mm (diámetro)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="th">Pulgadas</th>
                    <th className="th text-right">mm (aprox.)</th>
                  </tr></thead>
                  <tbody>
                    {PERNERIA_PULGADAS.map(r=>(
                      <tr key={r.pulgada} className="tr-hover">
                        <td className="td font-medium text-slate-700">{r.pulgada}</td>
                        <td className="td text-right"><span className="code">{r.mm} mm</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NORMATIVA ─────────────────────────────────────────── */}
      {tab === 'norma' && (
        <div className="space-y-5 max-w-2xl">
          {/* RIC oficial */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color:'#2563EB' }} />
              <h2 className="text-base font-semibold text-slate-800">Normativa RIC — SEC Chile</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Los pliegos técnicos RIC (Reglamento de Instalaciones de Consumo) son el marco normativo oficial
              para instalaciones eléctricas en Chile. Accede al portal oficial de la SEC donde están publicados
              todos los pliegos vigentes.
            </p>
            <a
              href="https://www.sec.cl/pliegos-tecnicos-ric/"
              target="_blank"
              rel="noopener"
              className="btn btn-primary"
            >
              <ExternalLink size={14} /> Portal RIC — SEC Chile (todos los pliegos)
            </a>
            <p className="text-xs text-slate-400 mt-3">
              El enlace abre la página oficial de la SEC con todos los pliegos RIC disponibles para descarga.
            </p>
          </div>

          {/* Catálogos */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={16} style={{ color:'#909090' }} />
              <h2 className="text-base font-semibold text-slate-800">Catálogos de fabricantes</h2>
            </div>
            <div className="flex flex-col gap-2">
              {CATALOGOS.map(c=>(
                <a key={c.href} href={c.href} target="_blank" rel="noopener"
                  className="btn btn-outline justify-start">
                  <ExternalLink size={13} /> {c.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
