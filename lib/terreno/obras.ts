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
}

export const BUCKET_TERRENO = 'terreno'
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

export type MetaFoto = { s: string; i: string; id: string; sl: string; a: string }

const corta = (v: unknown, n: number) => String(v ?? '').slice(0, n)

/**
 * Nombre del objeto en Storage. Lleva la metadata dentro (base64url) para que
 * listar la obra sea UNA sola llamada, sin tabla extra:
 *   obras/<slug>/f/<ts>.<id>.<meta>.<ext>
 */
export function rutaFoto(slug: string, ts: number, id: string, ext: string, meta: Partial<MetaFoto>) {
  const m: MetaFoto = {
    s: corta(meta.s, 120), i: corta(meta.i, 120), id: corta(meta.id, 60),
    sl: corta(meta.sl, 60), a: corta(meta.a, 60),
  }
  const b64 = Buffer.from(JSON.stringify(m), 'utf8').toString('base64url')
  return `obras/${slug}/f/${ts}.${id}.${b64}.${ext}`
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
