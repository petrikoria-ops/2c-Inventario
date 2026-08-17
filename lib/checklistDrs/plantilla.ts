// Plantilla estática del Checklist DRS — transcrita de "PROTOCOLO PRUEBAS
// DE VERIFICACIÓN INICIAL E INFORME IMÁGENES.xlsx" (exigido por DRS,
// empresa externa de inspección técnica).
//
// POST /api/checklists-drs copia etiqueta/referencia de cada ítem a una
// fila nueva en checklists_drs_items — un checklist ya creado no cambia
// si esta plantilla se edita después.

export interface SeccionPlantilla {
  id: string
  titulo: string
  /** encabezado de la columna de etiqueta (punto/sistema/prueba/circuito/ubicación) */
  columnaEtiqueta: string
  /** encabezado de la columna de valor medido — omitido si sinValor */
  columnaValor: string
  /** true = no se pide valor, solo etiqueta + estado (ej. "¿qué pruebas aplican?") */
  sinValor?: boolean
  /** true = muestra pills de estado (Pasa/No pasa/N-A, o las etiquetas de labelsEstado) */
  tieneEstado: boolean
  /** etiquetas custom para las pills, si el vocabulario del protocolo no es Pasa/No pasa */
  labelsEstado?: [string, string, string]
  /** true = el usuario puede agregar/quitar filas y renombrar la etiqueta (circuitos,
   *  salas, puntos de termografía varían por proyecto). false = puntos fijos del protocolo. */
  permiteAgregar: boolean
}

export interface ItemPlantilla {
  seccion: string
  tipo: 'medicion' | 'foto'
  etiqueta: string
  referencia?: string
  orden: number
}

export const SECCIONES_DRS: SeccionPlantilla[] = [
  {
    id: 'aislacion', titulo: 'Prueba de aislación — alimentadores y sub-alimentadores',
    columnaEtiqueta: 'Punto de medición', columnaValor: 'Resultado medido',
    tieneEstado: true, permiteAgregar: false,
  },
  {
    id: 'malla_tierra', titulo: 'Medición sistema de puesta a tierra',
    columnaEtiqueta: 'Sistema', columnaValor: 'Resistencia (Ω)',
    tieneEstado: false, permiteAgregar: true,
  },
  {
    id: 'generales_tablero_aplica', titulo: 'Pruebas generales de tableros — ¿qué aplica a este tablero?',
    columnaEtiqueta: 'Prueba', columnaValor: '', sinValor: true,
    tieneEstado: true, labelsEstado: ['Aplica', 'No aplica', 'N/A'], permiteAgregar: false,
  },
  {
    id: 'generales_tablero', titulo: 'Pruebas generales de tableros — resultados',
    columnaEtiqueta: 'Prueba', columnaValor: 'Resultado medido',
    tieneEstado: true, permiteAgregar: false,
  },
  {
    id: 'diferenciales_tablero', titulo: 'Pruebas diferenciales de tablero',
    columnaEtiqueta: 'Circuito / ubicación', columnaValor: 'Disparo medido',
    tieneEstado: true, permiteAgregar: true,
  },
  {
    id: 'enchufes', titulo: 'Pruebas de enchufes generales',
    columnaEtiqueta: 'Prueba', columnaValor: 'Resultado medido',
    tieneEstado: true, permiteAgregar: false,
  },
  {
    id: 'iluminacion', titulo: 'Pruebas de iluminación',
    columnaEtiqueta: 'Ubicación', columnaValor: 'Lux medido',
    tieneEstado: true, permiteAgregar: true,
  },
  {
    id: 'termografia', titulo: 'Termografía de tableros',
    columnaEtiqueta: 'Ubicación', columnaValor: 'T° máx. / mín. (°C)',
    tieneEstado: true, labelsEstado: ['Sin temperaturas relevantes', 'Con temperaturas relevantes', 'N/A'],
    permiteAgregar: true,
  },
]

export const SECCION_IMAGENES = {
  id: 'imagenes',
  titulo: 'Informe de imágenes — registro fotográfico de la instalación',
}

function medicion(seccion: string, filas: { etiqueta: string; referencia?: string }[]): ItemPlantilla[] {
  return filas.map((f, i): ItemPlantilla => ({ seccion, tipo: 'medicion', etiqueta: f.etiqueta, referencia: f.referencia, orden: i }))
}

export const ITEMS_PLANTILLA_DRS: ItemPlantilla[] = [
  ...medicion('aislacion', [
    { etiqueta: 'Fase 1 – Fase 2', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Fase 1 – Fase 3', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Fase 2 – Fase 3', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Neutro – Fase 1', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Neutro – Fase 2', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Neutro – Fase 3', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Tierra – Fase 1', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Tierra – Fase 2', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
    { etiqueta: 'Tierra – Fase 3', referencia: '1000 V · 60 s · exigido >1000 MΩ' },
  ]),
  ...medicion('malla_tierra', [
    { etiqueta: 'Electrodo' },
    { etiqueta: 'Electrodo + Estructura' },
    { etiqueta: 'Malla' },
  ]),
  ...medicion('generales_tablero_aplica', [
    { etiqueta: 'Impedancia de línea y de bucle' },
    { etiqueta: 'Resistencia línea a tierra' },
    { etiqueta: 'Cortocircuitos' },
    { etiqueta: 'Secuencia de fases' },
    { etiqueta: 'Continuidad de conductores de protección' },
    { etiqueta: 'Pruebas de interruptores diferenciales (RCD)' },
  ]),
  ...medicion('generales_tablero', [
    { etiqueta: 'Secuencia' },
    { etiqueta: 'Impedancia bucle' },
    { etiqueta: 'Corto presunto L-N' },
    { etiqueta: 'Corto presunto L-PE' },
    { etiqueta: 'Impedancia y corto L-L' },
    { etiqueta: 'Continuidad TP-Estructuras' },
  ]),
  ...medicion('diferenciales_tablero', [
    { etiqueta: 'Circuito N°1', referencia: 'Disparo < 30 mA' },
    { etiqueta: 'Circuito N°2', referencia: 'Disparo < 30 mA' },
    { etiqueta: 'Circuito N°3', referencia: 'Disparo < 30 mA' },
    { etiqueta: 'Circuito N°4', referencia: 'Disparo < 30 mA' },
    { etiqueta: 'Circuito N°5', referencia: 'Disparo < 30 mA' },
    { etiqueta: 'Circuito N°6', referencia: 'Disparo < 30 mA' },
  ]),
  ...medicion('enchufes', [
    { etiqueta: 'Circuito' },
    { etiqueta: 'Impedancia de bucle' },
    { etiqueta: 'Corto presunto' },
    { etiqueta: 'Caída de tensión' },
    { etiqueta: 'Disparo diferencial', referencia: '< 30 mA' },
    { etiqueta: 'Prueba de aislación' },
  ]),
  { seccion: 'enchufes', tipo: 'foto', etiqueta: 'Ubicación en plano', orden: 6 },
  ...medicion('iluminacion', [
    { etiqueta: 'Sala de venta', referencia: '500 lux recomendado (según proyecto)' },
    { etiqueta: 'Sala generador', referencia: '500 lux recomendado (según proyecto)' },
    { etiqueta: 'Cámara de carnes', referencia: '500 lux recomendado (según proyecto)' },
  ]),
  ...medicion('termografia', [
    { etiqueta: 'T.G.A.F. normal' },
    { etiqueta: 'Banco de condensadores' },
  ]),
  {
    seccion: 'imagenes', tipo: 'foto', orden: 0,
    etiqueta: '1. Numeración de la propiedad',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 1,
    etiqueta: '2. Tablero general (puerta exterior, cubierta e instalación interior) con su rotulación',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 2,
    etiqueta: '3. Tablero de distribución con su rotulación',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 3,
    etiqueta: '4. Tablero de banco de condensadores, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 4,
    etiqueta: '5. Tablero de transferencia automática, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 5,
    etiqueta: '6. Canalización de alimentadores generales (conductores, tuberías, bandejas, cajas de derivación/paso)',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 6,
    etiqueta: '7. Canalización subterránea, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 7,
    etiqueta: '8. Canalización aérea, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 8,
    etiqueta: '9. Sistema de puesta a tierra nuevo — construcción (profundidad, dimensiones, uniones, vista panorámica)',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 9,
    etiqueta: '9.1 Puesta a tierra — equipos de medición y valores obtenidos (Anexo 6.3, Pliego RIC N°06)',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 10,
    etiqueta: '10. Aparatos eléctricos (interruptores y enchufes, uniones y derivaciones)',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 11,
    etiqueta: '11. Equipos de iluminación (interior y exterior, uniones, aterrizajes, protección IP)',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 12,
    etiqueta: '12. Sistema de respaldo de energía — tipo (UPS/generador/batería) y placa, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 13,
    etiqueta: '13. Sistema de respaldo — protecciones y canalización de conductores, si corresponde',
  },
  {
    seccion: 'imagenes', tipo: 'foto', orden: 14,
    etiqueta: '14. Señaléticas empleadas, si corresponde',
  },
]
