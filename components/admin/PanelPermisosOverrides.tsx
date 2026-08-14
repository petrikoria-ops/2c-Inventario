'use client'
import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { MODULOS, NOMBRE_MODULO, type Modulo } from '@/lib/auth/permisos'

interface Override {
  id: number
  usuario_id: string
  modulo: string
  ver: boolean | null
  crear: boolean | null
  modificar: boolean | null
  eliminar: boolean | null
  notas: string | null
  perfiles?: { nombre_completo: string; email: string } | null
}

interface UsuarioOpcion {
  id: string
  nombre_completo: string
  email: string
}

const TRI = [
  { value: '', label: 'Hereda del puesto' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

function parseTri(v: string): boolean | null {
  return v === '' ? null : v === 'true'
}

function resumen(o: Override): string {
  const partes: string[] = []
  if (o.ver !== null) partes.push(`Ver: ${o.ver ? 'Sí' : 'No'}`)
  if (o.crear !== null) partes.push(`Crear: ${o.crear ? 'Sí' : 'No'}`)
  if (o.modificar !== null) partes.push(`Modificar: ${o.modificar ? 'Sí' : 'No'}`)
  if (o.eliminar !== null) partes.push(`Eliminar: ${o.eliminar ? 'Sí' : 'No'}`)
  return partes.join(' · ') || 'Sin cambios'
}

export default function PanelPermisosOverrides({ initialOverrides, usuarios }: { initialOverrides: Override[]; usuarios: UsuarioOpcion[] }) {
  const [overrides, setOverrides] = useState(initialOverrides)
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [form, setForm] = useState({ usuario_id: '', modulo: 'materiales' as Modulo, ver: '', crear: '', modificar: '', eliminar: '', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const { showToast } = useToast()

  const agregar = async () => {
    if (!form.usuario_id) { showToast('Selecciona una persona', 'error'); return }
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/permisos/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: form.usuario_id,
          modulo: form.modulo,
          ver: parseTri(form.ver),
          crear: parseTri(form.crear),
          modificar: parseTri(form.modificar),
          eliminar: parseTri(form.eliminar),
          notas: form.notas || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar la excepción')
      setOverrides(prev => [data, ...prev.filter(o => !(o.usuario_id === form.usuario_id && o.modulo === form.modulo))])
      setForm({ usuario_id: '', modulo: 'materiales', ver: '', crear: '', modificar: '', eliminar: '', notas: '' })
      setMostrarNuevo(false)
      showToast('Excepción guardada', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta excepción? La persona volverá a los permisos de su puesto.')) return
    const res = await fetch(`/api/admin/permisos/overrides/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('No se pudo eliminar', 'error'); return }
    setOverrides(prev => prev.filter(o => o.id !== id))
    showToast('Excepción eliminada', 'success')
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Excepciones por persona</h2>
        <button className="btn btn-outline btn-sm ml-auto" onClick={() => setMostrarNuevo(v => !v)}>
          {mostrarNuevo ? <X size={13} /> : <Plus size={13} />} {mostrarNuevo ? 'Cancelar' : 'Agregar excepción'}
        </button>
      </div>

      {mostrarNuevo && (
        <div className="p-4 border-b space-y-2" style={{ borderColor: '#EDEFF2' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="ov-usuario">Persona</label>
              <select id="ov-usuario" className="select w-full" value={form.usuario_id}
                onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}>
                <option value="">— Selecciona —</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo} — {u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ov-modulo">Módulo</label>
              <select id="ov-modulo" className="select w-full" value={form.modulo}
                onChange={e => setForm(f => ({ ...f, modulo: e.target.value as Modulo }))}>
                {MODULOS.map(m => <option key={m} value={m}>{NOMBRE_MODULO[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="label" htmlFor="ov-ver">Ver</label>
              <select id="ov-ver" className="select w-full" value={form.ver} onChange={e => setForm(f => ({ ...f, ver: e.target.value }))}>
                {TRI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ov-crear">Crear</label>
              <select id="ov-crear" className="select w-full" value={form.crear} onChange={e => setForm(f => ({ ...f, crear: e.target.value }))}>
                {TRI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ov-modificar">Modificar</label>
              <select id="ov-modificar" className="select w-full" value={form.modificar} onChange={e => setForm(f => ({ ...f, modificar: e.target.value }))}>
                {TRI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ov-eliminar">Eliminar</label>
              <select id="ov-eliminar" className="select w-full" value={form.eliminar} onChange={e => setForm(f => ({ ...f, eliminar: e.target.value }))}>
                {TRI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <textarea className="textarea" rows={2} placeholder="Motivo de la excepción (opcional, pero ayuda a recordar por qué)"
            value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          <button className="btn btn-primary btn-sm" onClick={agregar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar excepción'}
          </button>
        </div>
      )}

      <div className="divide-y" style={{ borderColor: '#EDEFF2' }}>
        {overrides.map(o => (
          <div key={o.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-700">
                <strong>{o.perfiles?.nombre_completo ?? o.usuario_id}</strong> · {NOMBRE_MODULO[o.modulo as Modulo] ?? o.modulo}
              </div>
              <div className="text-xs text-brand-n500">{resumen(o)}{o.notas ? ` — ${o.notas}` : ''}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} onClick={() => eliminar(o.id)} aria-label="Eliminar excepción">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!overrides.length && <p className="px-4 py-3 text-sm text-brand-n500">Sin excepciones registradas.</p>}
      </div>
    </div>
  )
}
