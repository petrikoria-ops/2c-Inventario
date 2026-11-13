import { createHash, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Herramientas de terreno (public/terreno/*.html): respaldo en la nube de las
// fotos de cada obra, SIN cuenta. El acceso es por "código de obra", que va en
// el link (#c=<código>). Como el repo es público, aquí solo se guarda el
// SHA-256 del código, nunca el código.
//
// Para habilitar una obra nueva: generar un código "<slug>.<aleatorio>",
// guardar aquí su sha256 y compartir el link con #c=<código>.
export const OBRAS_TERRENO: Record<string, { nombre: string; sha256: string }> = {
  'unimarc-sn-bdo': {
    nombre: 'UNIMARC SN BDO',
    sha256: '97233b545c5a6c6b36b842a4ff570323b2f2ff0cd12582516b98ede98305c63f',
  },
  'unimarc-maipu-911': {
    nombre: 'UNIMARC MAIPÚ 4 PTE · LOCAL 911',
    sha256: '4718d1c787e2c539e11d31f6ac5b1c59b0122968541819338c5291b704f6a366',
  },
}

export const BUCKET_TERRENO = 'terreno'
// Estado de la checklist y de la ruta de cada teléfono (JSON chico), para el informe en vivo.
export const BUCKET_DATOS = 'terreno-datos'
export const MAX_BYTES_FOTO = 50 * 1024 * 1024

export const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

/** Devuelve el slug de la obra si el código es válido; si no, null. */
export function obraDesdeCodigo(codigo: unknown): string | null {
  if (typeof codigo !== 'string' || codigo.length < 10 || codigo.length > 200) return null
  const slug = codigo.split('.')[0]
  const obra = OBRAS_TERRENO[slug]
  if (!obra) return null
  const a = createHash('sha256').update(codigo).digest()
  const b = Buffer.from(obra.sha256, 'hex')
  return a.length === b.length && timingSafeEqual(a, b) ? slug : null
}

export type MetaFoto = { s: string; i: string; id: string; sl: string; a: string; dv?: string }

const corta = (v: unknown, n: number) => String(v ?? '').slice(0, n)

/**
 * Nombre del objeto en Storage. Lleva la metadata dentro (base64url) para que
 * listar la obra sea UNA sola llamada, sin tabla extra:
 *   obras/<slug>/f/<ts>.<id>.<meta>.<ext>
 */
export function rutaFoto(slug: string, ts: number, id: string, ext: string, meta: Partial<MetaFoto>, carpeta: 'f' | 'm' = 'f') {
  const m: MetaFoto = {
    s: corta(meta.s, 120), i: corta(meta.i, 120), id: corta(meta.id, 60),
    sl: corta(meta.sl, 60), a: corta(meta.a, 60),
  }
  const dv = corta(meta.dv, 24)
  if (/^[a-z0-9]{4,24}$/i.test(dv)) m.dv = dv   // teléfono que la sacó (para no mostrarle su propia foto como ajena)
  const b64 = Buffer.from(JSON.stringify(m), 'utf8').toString('base64url')
  return `obras/${slug}/${carpeta}/${ts}.${id}.${b64}.${ext}`
}

export function leerNombre(nombre: string): { ts: number; id: string; ext: string; meta: MetaFoto } | null {
  const p = nombre.split('.')
  if (p.length !== 4) return null
  try {
    const meta = JSON.parse(Buffer.from(p[2], 'base64url').toString('utf8')) as MetaFoto
    return { ts: Number(p[0]), id: p[1], ext: p[3], meta }
  } catch {
    return null
  }
}

let bucketListo = false
/** Crea el bucket privado la primera vez (con la service_role). */
export async function asegurarBucket(sb: SupabaseClient) {
  if (bucketListo) return
  const { data } = await sb.storage.getBucket(BUCKET_TERRENO)
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET_TERRENO, {
      public: false,
      fileSizeLimit: MAX_BYTES_FOTO,
      allowedMimeTypes: Object.keys(EXT_POR_MIME),
    })
    if (error && !/exist/i.test(error.message)) throw error
  }
  bucketListo = true
}

let bucketDatosListo = false
/** Bucket privado para los estados (JSON) que suben los teléfonos. */
export async function asegurarBucketDatos(sb: SupabaseClient) {
  if (bucketDatosListo) return
  const { data } = await sb.storage.getBucket(BUCKET_DATOS)
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET_DATOS, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['application/json'],
    })
    if (error && !/exist/i.test(error.message)) throw error
  }
  bucketDatosListo = true
}

export type FotoNube = {
  nombre: string; url: string | null; mini: string | null; size: number; mime: string; subida: string | null
  ts: number; id: string; ext: string; seccion: string; item: string; itemId: string; slot: string; autor: string; dispositivo: string
}

/** Todas las fotos de la obra (de todos los teléfonos) con URL firmada de 1 hora. */
export async function listarFotos(sb: SupabaseClient, slug: string): Promise<FotoNube[]> {
  const prefijo = `obras/${slug}/f`
  const objetos: { name: string; id: string | null; metadata: Record<string, unknown> | null; created_at: string | null }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(BUCKET_TERRENO).list(prefijo, {
      limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    objetos.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const archivos = objetos.filter(o => o.id)
  // miniaturas (mismo nombre, carpeta m/, siempre .jpg)
  const minis = new Map<string, string>()
  {
    const { data } = await sb.storage.from(BUCKET_TERRENO).list(`obras/${slug}/m`, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
    const nm = (data ?? []).filter(o => o.id).map(o => o.name)
    for (let i = 0; i < nm.length; i += 100) {
      const lote = nm.slice(i, i + 100)
      const { data: fir } = await sb.storage.from(BUCKET_TERRENO).createSignedUrls(lote.map(n => `obras/${slug}/m/${n}`), 3600)
      lote.forEach((n, k) => { const u = fir?.[k]?.signedUrl; if (u) minis.set(n.replace(/\.[^.]+$/, ''), u) })
    }
  }
  const urls: (string | null)[] = []
  for (let i = 0; i < archivos.length; i += 100) {
    const lote = archivos.slice(i, i + 100).map(o => `${prefijo}/${o.name}`)
    const { data, error } = await sb.storage.from(BUCKET_TERRENO).createSignedUrls(lote, 3600)
    if (error) throw error
    lote.forEach((_, k) => urls.push(data?.[k]?.signedUrl ?? null))
  }
  return archivos.map((o, k) => {
    const n = leerNombre(o.name)
    return {
      nombre: o.name, url: urls[k], mini: minis.get(o.name.replace(/\.[^.]+$/, '')) ?? null, size: Number(o.metadata?.size ?? 0), mime: String(o.metadata?.mimetype ?? ''),
      subida: o.created_at, ts: n?.ts ?? 0, id: n?.id ?? '', ext: n?.ext ?? 'jpg',
      seccion: n?.meta.s ?? '', item: n?.meta.i ?? '', itemId: n?.meta.id ?? '', slot: n?.meta.sl ?? '', autor: n?.meta.a ?? '',
      dispositivo: n?.meta.dv ?? '',
    }
  })
}
