'use client'
import { useState, useCallback } from 'react'
import { FileText, Upload, Trash2, ExternalLink, Loader2, Plus, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { subirDocumentoTrabajador, getSignedUrlDocumentoTrabajador } from '@/lib/supabase/storage'
import { fechaCorta } from '@/lib/utils'
import type { GrupoDocumentos } from '@/lib/departamentos/documentosTrabajador'
import type { DocumentoTrabajador, Proyecto } from '@/types'

interface Props {
  grupo: GrupoDocumentos
  trabajadorId: number
  proyectos: Pick<Proyecto, 'id' | 'ot' | 'nombre'>[]
  initialData: DocumentoTrabajador[]
  editable?: boolean
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

function estadoVencimiento(fecha: string | null): 'vencido' | 'por_vencer' | null {
  if (!fecha) return null
  const en30 = new Date(); en30.setDate(en30.getDate() + 30)
  if (fecha < hoyISO()) return 'vencido'
  if (fecha <= en30.toISOString().slice(0, 10)) return 'por_vencer'
  return null
}

export default function DocumentosGrupo({ grupo, trabajadorId, proyectos, initialData, editable = true }: Props) {
  const [docs, setDocs] = useState<DocumentoTrabajador[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    categoria: grupo.categorias[0].value as string,
    titulo: '', proyecto_id: '', fecha_documento: '', fecha_vencimiento: '', notas: '',
  })
  const { showToast } = useToast()

  const categoriaSel = grupo.categorias.find(c => c.value === form.categoria) ?? grupo.categorias[0]

  const subir = useCallback(async () => {
    if (!file) { showToast('Selecciona un archivo', 'error'); return }
    if (!form.titulo.trim()) { showToast('El título es obligatorio', 'error'); return }
    setSaving(true)
    try {
      const sb = getSupabaseBrowser()
      const path = await subirDocumentoTrabajador(sb, trabajadorId, file)
      const res = await fetch('/api/documentos-trabajador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajador_id: trabajadorId,
          categoria: form.categoria,
          titulo: form.titulo.trim(),
          archivo_url: path,
          archivo_nombre: file.name,
          proyecto_id: categoriaSel.porObra && form.proyecto_id ? Number(form.proyecto_id) : null,
          fecha_documento: form.fecha_documento || null,
          fecha_vencimiento: categoriaSel.puedeVencer ? (form.fecha_vencimiento || null) : null,
          notas: form.notas || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      setDocs(prev => [data, ...prev])
      setForm({ categoria: grupo.categorias[0].value, titulo: '', proyecto_id: '', fecha_documento: '', fecha_vencimiento: '', notas: '' })
      setFile(null)
      setShowForm(false)
      showToast('Documento subido', 'success')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [file, form, categoriaSel, trabajadorId, grupo, showToast])

  const ver = useCallback(async (doc: DocumentoTrabajador) => {
    const sb = getSupabaseBrowser()
    const url = await getSignedUrlDocumentoTrabajador(sb, doc.archivo_url)
    if (url) window.open(url, '_blank', 'noopener')
    else showToast('No se pudo abrir el documento', 'error')
  }, [showToast])

  const eliminar = useCallback(async (doc: DocumentoTrabajador) => {
    if (!confirm(`¿Eliminar "${doc.titulo}"?`)) return
    const res = await fetch(`/api/documentos-trabajador/${doc.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error al eliminar', 'error'); return }
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    showToast('Documento eliminado', 'success')
  }, [showToast])

  return (
    <div className="panel">
      <div className="panel-header">
        <FileText size={14} style={{ color: 'var(--n-500)', flexShrink: 0 }} />
        <h2>{grupo.titulo}</h2>
        {editable && (
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm ml-auto">
            {showForm ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Subir documento</>}
          </button>
        )}
      </div>

      {editable && showForm && (
        <div className="p-4 border-b space-y-3" style={{ borderColor: '#EDEFF2' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de documento</label>
              <select className="select w-full" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                {grupo.categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Título</label>
              <input className="input w-full" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Contrato indefinido 2026" />
            </div>
            {categoriaSel.porObra && (
              <div>
                <label className="label">Obra</label>
                <select className="select w-full" value={form.proyecto_id} onChange={e => setForm(p => ({ ...p, proyecto_id: e.target.value }))}>
                  <option value="">Sin obra específica</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.ot} — {p.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Fecha del documento</label>
              <input type="date" className="input w-full" value={form.fecha_documento}
                onChange={e => setForm(p => ({ ...p, fecha_documento: e.target.value }))} />
            </div>
            {categoriaSel.puedeVencer && (
              <div>
                <label className="label">Fecha de vencimiento</label>
                <input type="date" className="input w-full" value={form.fecha_vencimiento}
                  onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Archivo</label>
              <input type="file" className="input w-full" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="col-span-2">
              <label className="label">Notas</label>
              <textarea className="textarea w-full" rows={2} value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
            </div>
          </div>
          <button onClick={subir} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Subiendo…</> : <><Upload size={13} /> Guardar documento</>}
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="p-6 text-center text-sm text-brand-n500">Sin documentos registrados todavía.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {docs.map(doc => {
            const venc = estadoVencimiento(doc.fecha_vencimiento)
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 text-sm">{doc.titulo}</span>
                    <span className="badge badge-gray text-[10px]">
                      {grupo.categorias.find(c => c.value === doc.categoria)?.label ?? doc.categoria}
                    </span>
                    {doc.proyectos && <span className="code text-[10px]">{doc.proyectos.ot}</span>}
                    {venc === 'vencido'    && <span className="badge badge-red text-[10px]">Vencido</span>}
                    {venc === 'por_vencer' && <span className="badge badge-yellow text-[10px]">Vence pronto</span>}
                  </div>
                  <div className="text-xs text-brand-n500 mt-0.5">
                    {doc.fecha_documento && <>Fecha: {fechaCorta(doc.fecha_documento)}</>}
                    {doc.fecha_vencimiento && <> · Vence: {fechaCorta(doc.fecha_vencimiento)}</>}
                    {' · '}Subido por {doc.subido_por_nombre ?? '—'}
                  </div>
                </div>
                <button onClick={() => ver(doc)} className="btn btn-ghost btn-sm" title="Ver documento">
                  <ExternalLink size={13} /> Ver
                </button>
                {editable && (
                  <button onClick={() => eliminar(doc)} className="btn-icon" style={{ color: '#DC2626' }} title="Eliminar" aria-label="Eliminar">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
