'use client'
import { useState } from 'react'

// Constante eléctrica: resistividad del cobre (Ω·mm²/m)
const RHO_COBRE = 0.0172

function calcCaida(v: number, i: number, l: number, s: number) {
  const dV  = (2 * RHO_COBRE * l * i) / s
  const pct = (dV / v) * 100
  return { dV, pct, ok: pct <= 3 }
}

function seccionMinima(i: number, l: number, pctMax: number, v: number) {
  const dVmax = v * (pctMax / 100)
  const s = (2 * RHO_COBRE * l * i) / dVmax
  const norm = [1.5,2.5,4,6,10,16,25,35,50,70,95,120]
  return { s, elegido: norm.find(n => n >= s) ?? norm[norm.length - 1] }
}

function calcBreaker(p: number, v: number, fp: number, fs: number, tri: boolean) {
  const In = tri ? p / (Math.sqrt(3) * v * fp) : p / (v * fp)
  const Ib = In * fs
  const norm = [6,10,16,20,25,32,40,50,63,80,100,125,160,200,250]
  return { In, Ib, breaker: norm.find(n => n >= Ib) ?? norm[norm.length - 1] }
}

const CHECKLIST = {
  mecanico: ['Gabinete con IP adecuado','Riel DIN fijado','Canaletas instaladas','Separadores de borneras','Prensaestopas apretados','Placa de bornes','Puerta con sello','Etiqueta del tablero'],
  cableado: ['Sección correcta según diseño','Ferrules en todos los extremos','Colores según RIC','Conductores identificados','Borneras numeradas','Tierra a barra PE','Sin cruces fuerza/control','Tornillos apretados'],
  pruebas:  ['Aislación >1 MΩ','Continuidad de tierra','Tensión de alimentación OK','Secuencia de fases (3F)','Prueba cada protección','Pulsadores e indicadores','Disparo diferencial OK','Relé térmico ajustado','Fotos del tablero','Planos conforme obra'],
}

type CheckKey = `${keyof typeof CHECKLIST}_${number}`

export default function RecursosPage() {
  // Calc caída tensión
  const [ct, setCt] = useState({ v:220, i:20, l:50, s:2.5 })
  const [ctRes, setCtRes] = useState<ReturnType<typeof calcCaida> | null>(null)

  // Calc sección
  const [sc, setSc] = useState({ i:30, l:30, pct:3, v:220 })
  const [scRes, setScRes] = useState<ReturnType<typeof seccionMinima> | null>(null)

  // Calc protección
  const [dp, setDp] = useState({ p:5000, v:220, fp:0.85, fs:1.25, tri:false })
  const [dpRes, setDpRes] = useState<ReturnType<typeof calcBreaker> | null>(null)

  // Checklist
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({} as any)
  const toggle = (k: CheckKey) => setChecks(p => ({ ...p, [k]: !p[k] }))
  const reset  = () => { if (confirm('¿Reiniciar checklist?')) setChecks({} as any) }

  return (
    <div className="p-5">
      <h1 className="text-lg font-bold text-slate-800 mb-4">📐 Calculadoras y Recursos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">

        {/* Caída de tensión */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-3">⚡ Caída de tensión</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label:'Tensión (V)', key:'v', type:'select', opts:[220,380] },
              { label:'Corriente (A)', key:'i', type:'number' },
              { label:'Longitud (m)', key:'l', type:'number' },
              { label:'Sección (mm²)', key:'s', type:'select', opts:[1.5,2.5,4,6,10,16,25,35,50,70] },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type==='select'
                  ? <select className="select text-xs" value={(ct as any)[f.key]} onChange={e=>setCt(p=>({...p,[f.key]:parseFloat(e.target.value)}))}>
                      {f.opts!.map(o=><option key={o}>{o}</option>)}
                    </select>
                  : <input type="number" className="input text-xs" value={(ct as any)[f.key]} onChange={e=>setCt(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />}
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm w-full mb-2" onClick={() => setCtRes(calcCaida(ct.v, ct.i, ct.l, ct.s))}>Calcular</button>
          {ctRes && (
            <div className={`rounded-lg px-3 py-2 text-sm font-medium text-center ${ctRes.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              ΔV = {ctRes.dV.toFixed(2)} V ({ctRes.pct.toFixed(2)}%)  {ctRes.ok ? '✔ OK' : '✕ Excede 3%'}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">ρ cobre = 0.0172 Ω·mm²/m | Límite RIC ≤ 3%</p>
        </div>

        {/* Sección de conductor */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-3">🔌 Sección de conductor</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label:'Corriente (A)', key:'i' },
              { label:'Longitud (m)', key:'l' },
              { label:'Caída máx. (%)', key:'pct' },
              { label:'Tensión (V)', key:'v' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input type="number" className="input text-xs" value={(sc as any)[f.key]} onChange={e=>setSc(p=>({...p,[f.key]:parseFloat(e.target.value)}))} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm w-full mb-2" onClick={() => setScRes(seccionMinima(sc.i, sc.l, sc.pct, sc.v))}>Calcular</button>
          {scRes && (
            <div className="bg-blue-50 text-blue-800 rounded-lg px-3 py-2 text-sm font-medium text-center">
              S mín. = {scRes.s.toFixed(2)} mm² → usar <strong>{scRes.elegido} mm²</strong>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">S = (2 × ρ × L × I) / ΔV<sub>máx</sub></p>
        </div>

        {/* Dimensionamiento protecciones */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-3">🔒 Dimensionar protección</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label:'Potencia (W)', key:'p' },
              { label:'Tensión (V)', key:'v' },
              { label:'Factor potencia', key:'fp' },
              { label:'Factor servicio', key:'fs' },
            ].map(f => (
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
          <button className="btn btn-primary btn-sm w-full mb-2" onClick={() => setDpRes(calcBreaker(dp.p, dp.v, dp.fp, dp.fs, dp.tri))}>Calcular</button>
          {dpRes && (
            <div className="bg-blue-50 text-blue-800 rounded-lg px-3 py-2 text-sm font-medium text-center">
              I<sub>n</sub>={dpRes.In.toFixed(1)}A · I<sub>diseño</sub>={dpRes.Ib.toFixed(1)}A
              <br />Interruptor: <strong>{dpRes.breaker} A</strong>
            </div>
          )}
        </div>

        {/* Links RIC */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 mb-3">📘 Normativa RIC — SEC Chile</h3>
          <div className="space-y-1.5">
            {[
              ['Portal SEC — Reglamentos RIC', 'https://www.sec.cl/reglamentos-de-instalaciones-electricas-de-consumo/'],
              ['RIC N°1 — Generalidades',       'https://www.sec.cl/wp-content/uploads/2022/03/RIC-N-1-Generalidades.pdf'],
              ['RIC N°2 — Conductores',          'https://www.sec.cl/wp-content/uploads/2022/03/RIC-N-2-Conductores.pdf'],
              ['RIC N°3 — Bandejas de cables',   'https://www.sec.cl/wp-content/uploads/2022/03/RIC-N-3-Bandejas-de-cables.pdf'],
              ['RIC N°5 — Cuartos eléctricos',   'https://www.sec.cl/wp-content/uploads/2022/03/RIC-N-5-Cuartos-electricos.pdf'],
              ['RIC N°10 — Instalaciones BT',    'https://www.sec.cl/wp-content/uploads/2022/03/RIC-N-10-Instalaciones-en-BT.pdf'],
              ['Trámites en línea SEC',           'https://www.sec.cl/tramites-en-linea/'],
              ['NCh Elec 4/2003 — Simbología',   'https://www.sec.cl/wp-content/uploads/2022/09/NCh-Elec-4-2003.pdf'],
            ].map(([label, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs py-1 border-b border-slate-100 last:border-0">
                🔗 {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Checklist tablero */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">✅ Checklist armado y pruebas de tablero</h3>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={reset}>Reiniciar</button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨 Imprimir</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(CHECKLIST) as [keyof typeof CHECKLIST, string[]][]).map(([grupo, items]) => (
            <div key={grupo}>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                {grupo === 'mecanico' ? '🔩 Armado mecánico' : grupo === 'cableado' ? '🔌 Cableado' : '🧪 Pruebas'}
              </h4>
              <ul className="space-y-1">
                {items.map((item, i) => {
                  const k = `${grupo}_${i}` as CheckKey
                  return (
                    <li key={k} className="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
                      <input type="checkbox" id={k} checked={!!checks[k]} onChange={() => toggle(k)} className="accent-blue-700 w-4 h-4 flex-shrink-0" />
                      <label htmlFor={k} className={`cursor-pointer ${checks[k] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item}</label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
