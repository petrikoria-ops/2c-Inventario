'use client'
import { Fragment, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { PUESTOS_POR_DEPARTAMENTO, MODULOS, NOMBRE_MODULO, type Departamento } from '@/lib/auth/permisos'

const NOMBRE_DEPARTAMENTO: Record<Departamento, string> = {
  bodega: 'Bodega', taller: 'Taller', oficina_tecnica: 'Oficina Técnica',
  prevencion: 'Prevención', rrhh: 'Recursos Humanos', directiva: 'Directiva',
  admin_software: 'Administración de software',
}

interface FilaPermiso {
  departamento: string
  puesto: string
  modulo: string
  ver: boolean
  crear: boolean
  modificar: boolean
}

type Campo = 'ver' | 'crear' | 'modificar'
const CAMPOS: { key: Campo; label: string }[] = [
  { key: 'ver', label: 'Ver' },
  { key: 'crear', label: 'Crear' },
  { key: 'modificar', label: 'Mod.' },
]

export default function PanelPermisosPuesto({ initialData }: { initialData: FilaPermiso[] }) {
  const [mapa, setMapa] = useState(() => {
    const m = new Map<string, FilaPermiso>()
    initialData.forEach(f => m.set(`${f.departamento}|${f.puesto}|${f.modulo}`, f))
    return m
  })
  const [guardando, setGuardando] = useState<string | null>(null)
  const { showToast } = useToast()

  // 'Dueño', 'Jefe directivo' y 'Administrador de software' bypasean todo
  // vía nivel_acceso (master/admin_software) — no tienen filas y mostrar
  // sus casillas vacías confundiría más de lo que ayuda.
  const departamentos = (Object.keys(PUESTOS_POR_DEPARTAMENTO) as Departamento[])
    .filter(d => d !== 'admin_software')

  const toggle = async (departamento: string, puesto: string, modulo: string, campo: Campo) => {
    const key = `${departamento}|${puesto}|${modulo}`
    const actual = mapa.get(key) ?? { departamento, puesto, modulo, ver: false, crear: false, modificar: false }
    const valor = !actual[campo]
    setMapa(prev => new Map(prev).set(key, { ...actual, [campo]: valor }))
    setGuardando(key)
    try {
      const res = await fetch('/api/admin/permisos/puesto', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departamento, puesto, modulo, campo, valor }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo guardar')
    } catch (e: any) {
      setMapa(prev => new Map(prev).set(key, actual))
      showToast(e.message, 'error')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <div className="space-y-6">
      {departamentos.map(dep => {
        const puestos = PUESTOS_POR_DEPARTAMENTO[dep].filter(p => p.nivel !== 'master' && p.nivel !== 'admin_software')
        if (!puestos.length) return null
        return (
          <div key={dep} className="panel">
            <div className="panel-header"><h2>{NOMBRE_DEPARTAMENTO[dep]}</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="th" rowSpan={2} style={{ verticalAlign: 'bottom' }}>Módulo</th>
                    {puestos.map(p => (
                      <th key={p.puesto} className="th text-center" colSpan={3}>{p.puesto}</th>
                    ))}
                  </tr>
                  <tr>
                    {puestos.map(p => (
                      <Fragment key={p.puesto}>
                        {CAMPOS.map(c => (
                          <th key={`${p.puesto}-${c.key}`} className="th text-center" style={{ width: 44 }}>{c.label}</th>
                        ))}
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULOS.map((modulo, i) => (
                    <tr key={modulo} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="td whitespace-nowrap font-medium">{NOMBRE_MODULO[modulo]}</td>
                      {puestos.map(p => {
                        const key = `${dep}|${p.puesto}|${modulo}`
                        const fila = mapa.get(key)
                        return (
                          <Fragment key={key}>
                            {CAMPOS.map(c => (
                              <td key={c.key} className="td text-center">
                                <input
                                  type="checkbox"
                                  checked={!!fila?.[c.key]}
                                  disabled={guardando === key}
                                  onChange={() => toggle(dep, p.puesto, modulo, c.key)}
                                  aria-label={`${c.label} — ${p.puesto} — ${NOMBRE_MODULO[modulo]}`}
                                />
                              </td>
                            ))}
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
