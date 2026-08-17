// Datos de referencia del Anexo Opcional SAT por tablero — transcritos de
// la skill kit-documentos-2c-electricidad (fat-sat-puesta-marcha.md), que
// ya define la estructura vigente (condensada a 1 página tras 6 rediseños).
// Todo esto es solo texto de ayuda junto a los 5 ítems del checklist
// consolidado — no se guarda por fila, cada verificaciones_ric_tableros
// solo persiste el resultado Pasa/No pasa/N/A de cada ítem.

export interface TipoTablero { id: string; nombre: string; puntosEspecificos: string[] }

// Librería de 9 tipos de tablero conocidos — informa el ítem 4 del
// checklist ("puntos específicos según tipo de tablero").
export const TIPOS_TABLERO: TipoTablero[] = [
  { id: 'banco_condensadores', nombre: 'Banco de condensadores', puntosEspecificos: [
      'Secuencia de conexión de pasos (steps)',
      'Controlador de reactiva (setpoint cos φ, tiempo de conmutación)',
      'Resistencias de descarga (tensión residual < 50 V tras desconexión)',
      'Ventilación/temperatura del gabinete',
      'Contactores anti-inrush si existen',
  ]},
  { id: 'tdf_enchufes', nombre: 'Tablero de enchufes (TDF)', puntosEspecificos: [
      'Diferenciales 30 mA por circuito (botón test)',
      'Continuidad de tierra en puntos representativos',
      'Polaridad fase-neutro-tierra',
  ]},
  { id: 'ats_transferencia', nombre: 'Tablero con transferencia Normal/Emergencia (ATS)', puntosEspecificos: [
      'Prueba de transferencia automática (simular falla de red, tiempo de transferencia)',
      'Enclavamiento mecánico/eléctrico N-E',
      'Secuencia de fases en ambas fuentes',
      'Retransferencia y enfriamiento del generador',
      'Señalización de estado',
  ]},
  { id: 'tda_iluminacion', nombre: 'Tablero de iluminación (TDA)', puntosEspecificos: [
      'Diferenciales por circuito de alumbrado',
      'Contactores/fotocélulas/control horario',
      'Circuitos de emergencia o luces de escape si aplica',
      'Prueba de encendido por sectores',
  ]},
  { id: 'clima_ventilacion', nombre: 'Tablero de clima/ventilación', puntosEspecificos: [
      'Térmicas/guardamotor de compresores/ventiladores/extractores',
      'Contactores/arrancadores (directo, estrella-triángulo, variador)',
      'Sentido de giro de motores trifásicos',
      'Enclavamientos de seguridad de extracción de emergencia',
  ]},
  { id: 'computacion_data', nombre: 'Tablero de computación/data', puntosEspecificos: [
      'UPS y autonomía si existe',
      'Tipo de diferencial adecuado a carga electrónica (A o B)',
      'Tierra dedicada/aislada si el diseño la contempla',
      'Precaución de desconectar cargas sensibles antes de HV',
  ]},
  { id: 'mixto_retail', nombre: 'Tablero mixto alumbrado + fuerza (retail/sala de ventas)', puntosEspecificos: [
      'Diferenciales en ambos tipos de circuito',
      'Circuitos de cajas/POS si están incluidos',
      'Prueba de iluminación decorativa/vitrinas',
  ]},
  { id: 'frio_alimentario', nombre: 'Tablero de frío alimentario', puntosEspecificos: [
      'Térmicas/guardamotor de compresores',
      'Arranque (directo/estrella-triángulo) y sentido de giro',
      'Continuidad de tierra en carcasas metálicas',
      'Alarmas de temperatura/control de cámaras si están conectadas',
      'Protecciones dimensionadas para arranque simultáneo',
  ]},
]

// Requisitos de terreno SOLO SAT — informan el ítem 3 del checklist.
export const REQUISITOS_TERRENO_SAT: string[] = [
  'Verificación de que el tablero llegó sin daños de transporte',
  'Reapriete de conexiones y barras tras transporte (torque)',
  'Verificación de conexionado a la instalación real (acometida, alimentadores, tierras)',
  'Medición de resistencia de puesta a tierra del sistema',
  'Verificación de secuencia y rotación de fases con la red real',
  'Repetición de aislación y continuidad ya conectado en sitio',
  'Prueba funcional con alimentación real (control, señalización, alarmas, enclavamientos)',
  'Si aplica: prueba de transferencia Normal-Emergencia con red y generador reales',
  'Verificación de identificación/rotulado definitivo y planos as-built',
  'Registro de condiciones ambientales del sitio si son relevantes',
]

// Núcleo fijo IEC 61439-1 (cláusula 11) — informan los ítems 1 y 2.
export const NUCLEO_IEC_ENSAYOS: { prueba: string; clausula: string; criterio: string }[] = [
  { prueba: 'Continuidad circuito de protección', clausula: '11.4',    criterio: '≤ 0,5 Ω' },
  { prueba: 'Resistencia de aislamiento',          clausula: '11.9.3', criterio: '≥ 500 kΩ' },
  { prueba: 'Rigidez dieléctrica (HV AC)',         clausula: '11.9.2', criterio: 'Sin ruptura a tensión de ensayo (Tabla 8)' },
]

export const NUCLEO_IEC_INSPECCION: { verificacion: string; clausula: string; metodo: string }[] = [
  { verificacion: 'Grado de protección (IP)',                       clausula: '11.2',  metodo: 'Visual/documental' },
  { verificacion: 'Distancias de aislamiento y líneas de fuga',      clausula: '11.3',  metodo: 'Visual/medición' },
  { verificacion: 'Incorporación de componentes',                   clausula: '11.5',  metodo: 'Visual vs. planos' },
  { verificacion: 'Circuitos internos y conexiones (torque)',       clausula: '11.6',  metodo: 'Visual + dinamométrica' },
  { verificacion: 'Bornes conductores externos',                    clausula: '11.7',  metodo: 'Visual' },
  { verificacion: 'Operación mecánica (puertas, enclavamientos)',    clausula: '11.8',  metodo: 'Manual' },
  { verificacion: 'Funcionamiento operacional (mando/señalización)', clausula: '11.10', metodo: 'Funcional' },
]

// Único ítem del checklist que sigue consolidado (no se itemiza) — el
// registro fotográfico general del tablero, que ya tiene su propio
// foto_tomada/foto_url en verificaciones_ric_tableros.
export const ITEM_REGISTRO_FOTOGRAFICO_SAT = '5. Registro fotográfico completo'

export function getTipoTablero(id: string | null | undefined): TipoTablero | undefined {
  return TIPOS_TABLERO.find(t => t.id === id)
}

// ─────────────────────────────────────────────────────────────────────
//  Checklist itemizado — 1 fila por punto de verificación (ver
//  verificaciones_ric_tableros_items), igual de guiado que
//  pruebas_alimentadores_items: cada punto tiene su propio Pasa/No
//  pasa/N/A en vez de un único resultado por categoría completa.
// ─────────────────────────────────────────────────────────────────────

export type CategoriaChecklistSat = 'ensayos_instrumento' | 'inspeccion' | 'requisitos_terreno' | 'puntos_especificos'

export const CATEGORIAS_CHECKLIST_SAT: { categoria: CategoriaChecklistSat; titulo: string }[] = [
  { categoria: 'ensayos_instrumento', titulo: '1. Ensayos con instrumento' },
  { categoria: 'inspeccion',          titulo: '2. Inspección visual, manual y funcional' },
  { categoria: 'requisitos_terreno',  titulo: '3. Requisitos de terreno propios de SAT' },
  { categoria: 'puntos_especificos',  titulo: '4. Puntos específicos según tipo de tablero' },
]

export interface ItemPlantillaSat { categoria: CategoriaChecklistSat; texto: string; orden: number }

// Los 20 ítems fijos (siempre iguales, no dependen del tipo de tablero) —
// textos idénticos a los usados en el backfill de
// migration_verificacion_ric_sat_items.sql.
const ITEMS_SAT_FIJOS: ItemPlantillaSat[] = [
  ...NUCLEO_IEC_ENSAYOS.map((e, i): ItemPlantillaSat => ({
    categoria: 'ensayos_instrumento', orden: i, texto: `${e.prueba} (cláusula ${e.clausula}, criterio ${e.criterio})`,
  })),
  ...NUCLEO_IEC_INSPECCION.map((e, i): ItemPlantillaSat => ({
    categoria: 'inspeccion', orden: i, texto: `${e.verificacion} (cláusula ${e.clausula})`,
  })),
  ...REQUISITOS_TERRENO_SAT.map((texto, i): ItemPlantillaSat => ({ categoria: 'requisitos_terreno', orden: i, texto })),
]

// Ítems de "puntos específicos" — dependen del tipo de tablero elegido;
// vacío si todavía no se eligió tipo (o no hay tipo listado).
export function itemsPuntosEspecificos(tipoTableroId: string | null | undefined): ItemPlantillaSat[] {
  const tipo = getTipoTablero(tipoTableroId)
  if (!tipo) return []
  return tipo.puntosEspecificos.map((texto, i): ItemPlantillaSat => ({ categoria: 'puntos_especificos', orden: i, texto }))
}

// Filas listas para insertar en verificaciones_ric_tableros_items al
// crear un tablero nuevo (o al cambiar su tipo, solo para la categoría
// puntos_especificos — ver ruta PATCH de tableros).
export function filasItemsTablero(tableroEntryId: number, tipoTableroId?: string | null) {
  return [...ITEMS_SAT_FIJOS, ...itemsPuntosEspecificos(tipoTableroId)].map(it => ({
    tablero_entry_id: tableroEntryId,
    categoria: it.categoria,
    orden: it.orden,
    texto: it.texto,
  }))
}
