// Catálogo fijo del checklist RIC N°2 de armado de tablero — antes vivía
// solo dentro de app/checklist/page.tsx (uso ad-hoc, sin persistir). Ahora
// también lo usa components/tableros/ChecklistTablero.tsx (persistido por
// tablero, ver migration_tableros.sql). Un mismo ítem se identifica igual
// en ambos lugares: clave `${sectionId}_${índice}`.
export const CHECKLIST_SECTIONS = [
  {
    id: 'mecanico',
    title: '1. Armado mecánico',
    items: [
      'Gabinete con grado IP adecuado al ambiente',
      'Riel DIN correctamente fijado',
      'Canaletas instaladas y aseguradas',
      'Separadores de borneras instalados',
      'Prensaestopas apretados y sellados',
      'Placa de bornes fijada',
      'Puerta con sello perimetral en buen estado',
      'Etiqueta identificatoria del tablero',
    ],
  },
  {
    id: 'cableado',
    title: '2. Cableado',
    items: [
      'Sección de conductores correcta según diseño',
      'Ferrules instalados en todos los extremos',
      'Colores de conductores según RIC',
      'Conductores debidamente identificados',
      'Borneras numeradas correlativamente',
      'Conductor de tierra conectado a barra PE',
      'Sin cruces entre cableado de fuerza y control',
      'Tornillos de terminales apretados (torque)',
    ],
  },
  {
    id: 'pruebas',
    title: '3. Pruebas y comisionamiento',
    items: [
      'Resistencia de aislación > 1 MΩ (megóhmetro)',
      'Continuidad de conductor de tierra verificada',
      'Tensión de alimentación correcta (± 5%)',
      'Secuencia de fases correcta (sistemas trifásicos)',
      'Prueba individual de cada protección',
      'Pulsadores e indicadores luminosos operativos',
      'Disparo de diferencial verificado',
      'Relé térmico ajustado a la corriente nominal',
      'Fotografías del tablero terminado tomadas',
      'Planos conforme a obra actualizados',
    ],
  },
] as const

export type CheckKey = string // `${sectionId}_${índice}`

export const CHECKLIST_TOTAL_ITEMS = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
