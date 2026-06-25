'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Power } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { PUESTOS_POR_DEPARTAMENTO, type Perfil, type NivelAcceso, type Departamento } from '@/lib/auth/permisos'

const NOMBRE_DEPARTAMENTO: Record<Departamento, string> = {
  bodega: 'Bodega', taller: 'Taller', oficina_tecnica: 'Oficina Técnica',
  prevencion: 'Prevención', rrhh: 'Recursos Humanos', directiva: 'Directiva',
  admin_software: 'Administración de software',
}

const DEPARTAMENTOS = Object.keys(PUESTOS_POR_DEPARTAMENTO) as Departamento[]

export default function PanelUsuarios({ initialData, miId }: { initialData: Perfil[]; miId: string }) {
  const [usuarios, setUsuarios] = useState(initialData)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{ departamento: Departamento; puesto: string; nivel_acceso: NivelAcceso }>({
    departamento: 'bodega', puesto: '', nivel_acceso: 'visualizacion',
  })
  const [guardando, setGuardando] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const abrir = (u: Perfil) => {
    setEditando(u.id)
    setForm({ departamento: u.departamento, puesto: u.puesto, nivel_acceso: u.nivel_acceso })
  }

  const guardar = async (id: string) => {
    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo actualizar')
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...form } : u))
      setEditando(null)
      showToast('Usuario actualizado', 'success')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (u: Perfil) => {
    if (u.id === miId) { showToast('No puedes desactivar tu propia cuenta.', 'error'); return }
    if (u.activo && !confirm(`¿Desactivar a ${u.nombre_completo}? Perderá acceso al sistema.`)) return
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo actualizar')
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x))
      showToast(u.activo ? 'Usuario desactivado' : 'Usuario reactivado', 'success')
      router.refresh()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const puestos = PUESTOS_POR_DEPARTAMENTO[form.departamento] ?? []

  return (
    <div className="panel">
      <div className="panel-header"><h2>Usuarios</h2><span className="badge badge-gray">{usuarios.length}</span></div>
      <div className="divide-y" style={{ borderColor: '#ECEEF1' }}>
        {usuarios.map(u => (
          <div key={u.id} className={`p-3 ${!u.activo ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {u.nombre_completo} <span className="text-slate-400 font-normal">— {u.email}</span>
                  {!u.activo && <span className="badge badge-gray ml-2">Inactivo</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {NOMBRE_DEPARTAMENTO[u.departamento] ?? u.departamento} · {u.puesto} · <span className="font-medium">{u.nivel_acceso}</span>
                </div>
              </div>
              {editando !== u.id && (
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn btn-outline btn-sm" onClick={() => abrir(u)}><Pencil size={12} /> Editar</button>
                  {u.id !== miId && (
                    <button className="btn btn-sm" style={{ color: u.activo ? '#DC2626' : '#059669' }} onClick={() => toggleActivo(u)}>
                      <Power size={12} /> {u.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {editando === u.id && (
              <div className="mt-3 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ background: '#FAFBFC', border: '1px solid #E8EAED' }}>
                <div>
                  <label className="label" htmlFor={`depto-${u.id}`}>Departamento</label>
                  <select id={`depto-${u.id}`} className="select" value={form.departamento}
                    onChange={e => setForm(f => ({ ...f, departamento: e.target.value as Departamento, puesto: '' }))}>
                    {DEPARTAMENTOS.map(d => <option key={d} value={d}>{NOMBRE_DEPARTAMENTO[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`puesto-${u.id}`}>Puesto</label>
                  <select id={`puesto-${u.id}`} className="select" value={form.puesto}
                    onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))}>
                    <option value="">— Selecciona —</option>
                    {puestos.map(p => <option key={p.puesto} value={p.puesto}>{p.puesto}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`nivel-${u.id}`}>Nivel de acceso</label>
                  <select id={`nivel-${u.id}`} className="select" value={form.nivel_acceso}
                    onChange={e => setForm(f => ({ ...f, nivel_acceso: e.target.value as NivelAcceso }))}>
                    <option value="visualizacion">Visualización</option>
                    <option value="operador">Operador</option>
                    <option value="encargado">Encargado</option>
                    <option value="jefe_departamento">Jefe de departamento</option>
                    <option value="directiva">Directiva</option>
                    <option value="admin_software">Administrador de software</option>
                    <option value="master">Master</option>
                  </select>
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button disabled={guardando || !form.puesto} className="btn btn-success btn-sm" onClick={() => guardar(u.id)}>
                    <Check size={12} /> Guardar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}><X size={12} /> Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
