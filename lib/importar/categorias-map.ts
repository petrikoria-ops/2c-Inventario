// ─── Mapa de palabras clave → categoría ──────────────────────────────────────
// Editar este archivo para ampliar o corregir reglas sin tocar el código de la app.
// Palabras clave: minúsculas, sin tildes (el motor normaliza la descripción antes de comparar).
// Orden importante: reglas más específicas primero dentro del mismo array.

export const VALID_CATEGORIES = [
  'Conductores y Cables',
  'Borneras y Terminales',
  'Protecciones (Automáticos)',
  'Diferenciales',
  'Contactores y Relés',
  'Riel DIN y Accesorios',
  'Prensaestopas',
  'Bandejas portacables',
  'Canastillos',
  'Escalerillas',
  'Ductos y canalizaciones',
  'Tuberías (conduit/EMT)',
  'Soportería y fijación',
  'Tornillería y Fijaciones',
  'Pulsadores y Señalización',
  'Instrumentos y Medición',
  'Fuentes y Transformadores',
] as const

export type ValidCategory = typeof VALID_CATEGORIES[number]

interface CatRule {
  keywords: string[]
  categoria: ValidCategory
}

// ─── Reglas (más específicas primero dentro de cada grupo) ────────────────────
export const CATEGORY_RULES: CatRule[] = [
  // Conductores y Cables
  { keywords: ['cable', 'thhn', 'thwn', 'conductor', 'alambre'], categoria: 'Conductores y Cables' },

  // Borneras y Terminales  — "uk " con espacio para no matchear "ukulele" etc.
  { keywords: ['bornera', 'terminal', 'phoenix', 'uk '], categoria: 'Borneras y Terminales' },

  // Protecciones automáticas
  { keywords: ['automatico', 'interruptor', 'ic60', 'nxb', 'magnetotermico'], categoria: 'Protecciones (Automáticos)' },

  // Diferenciales — "id " con espacio para evitar match en "identificacion"
  { keywords: ['diferencial', 'residual', 'id ', 'rcbo'], categoria: 'Diferenciales' },

  // Contactores y Relés
  { keywords: ['contactor', 'lc1d'], categoria: 'Contactores y Relés' },

  // Riel DIN — "riel din" primero (más específico que "riel")
  { keywords: ['riel din', 'riel'], categoria: 'Riel DIN y Accesorios' },

  // Prensaestopas — "prensa estopa" cubre la variante con espacio
  { keywords: ['prensaestopa', 'prensa estopa'], categoria: 'Prensaestopas' },

  // Bandejas
  { keywords: ['bandeja'], categoria: 'Bandejas portacables' },

  // Canastillos
  { keywords: ['canastillo', 'malla'], categoria: 'Canastillos' },

  // Escalerillas
  { keywords: ['escalerilla'], categoria: 'Escalerillas' },

  // Ductos y canalizaciones
  { keywords: ['ducto', 'canaleta', 'ranurado'], categoria: 'Ductos y canalizaciones' },

  // Tuberías conduit / EMT
  { keywords: ['conduit', 'emt', 'tuberia', 'tubo'], categoria: 'Tuberías (conduit/EMT)' },

  // Soportería
  { keywords: ['soporte', 'abrazadera', 'fijacion'], categoria: 'Soportería y fijación' },

  // Tornillería
  { keywords: ['perno', 'tuerca', 'tornillo', 'golilla'], categoria: 'Tornillería y Fijaciones' },

  // Pulsadores y Señalización
  { keywords: ['piloto', 'pulsador', 'boton', 'senalizacion'], categoria: 'Pulsadores y Señalización' },

  // Instrumentos
  { keywords: ['rele', 'instrumento', 'medidor', 'amperimetro', 'voltimetro'], categoria: 'Instrumentos y Medición' },

  // Fuentes y Transformadores
  { keywords: ['fuente', 'transformador', 'trafo'], categoria: 'Fuentes y Transformadores' },
]

// ─── Resultado de la clasificación ───────────────────────────────────────────
export interface ClassifyResult {
  categoria: string | null
  confidence: 'alta' | 'none'
  keyword:    string | null
}

// ─── Normalización interna: minúsculas + sin tildes ───────────────────────────
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ─── Clasificar por reglas ────────────────────────────────────────────────────
export function classifyByRules(descripcion: string | null | undefined): ClassifyResult {
  if (!descripcion) return { categoria: null, confidence: 'none', keyword: null }
  const normalized = norm(descripcion)
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        return { categoria: rule.categoria, confidence: 'alta', keyword: kw }
      }
    }
  }
  return { categoria: null, confidence: 'none', keyword: null }
}
