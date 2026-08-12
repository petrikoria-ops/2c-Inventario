// Normas citables en un hallazgo, portadas 1:1 desde referencia/normas.json
// de la skill kit-prevencionista-riesgos. `verificar` = true indica que el
// informe debe advertir "(verificar versión vigente)" al citarla.

export interface Norma {
  id: string
  nombre: string
  tema: string
  verificar: boolean
}

export const NORMAS: Norma[] = [
  { id: 'ley-16744', nombre: 'Ley 16.744', tema: 'Seguro social contra accidentes del trabajo y enfermedades profesionales', verificar: false },
  { id: 'ds-40', nombre: 'DS 40 (MINTRAB)', tema: 'Reglamento sobre Prevención de Riesgos Profesionales (RIOHS, Depto. de Prevención, Obligación de Informar art. 21)', verificar: true },
  { id: 'ds-44', nombre: 'DS 44/2024 (MINTRAB)', tema: 'Nuevo reglamento sobre gestión preventiva de los riesgos laborales (actualiza materias del DS 40)', verificar: true },
  { id: 'ds-54', nombre: 'DS 54 (MINTRAB)', tema: 'Comités Paritarios de Higiene y Seguridad', verificar: false },
  { id: 'ds-594', nombre: 'DS 594 (MINSAL)', tema: 'Condiciones sanitarias y ambientales básicas en los lugares de trabajo (agua potable, servicios higiénicos, duchas, comedor, vestidores, iluminación, evacuación, extintores)', verificar: true },
  { id: 'ds-76', nombre: 'DS 76 (MINTRAB)', tema: 'Gestión de la seguridad y salud en obras con empresas contratistas y subcontratistas (art. 66 bis Ley 16.744)', verificar: false },
  { id: 'nch-1433', nombre: 'NCh 1433', tema: 'Ubicación y señalización de extintores portátiles (altura de montaje, acceso)', verificar: true },
  { id: 'nch-2189', nombre: 'NCh 2189', tema: 'Señalización de seguridad: vías de evacuación, condiciones básicas', verificar: true },
  { id: 'sec-ric', nombre: 'Normativa eléctrica SEC (Pliegos RIC)', tema: 'Instalaciones de consumo: envolventes, protecciones, ausencia de partes energizadas accesibles (reemplaza a NCh Elec. 4/2003)', verificar: true },
  { id: 'ley-20001-ds63', nombre: 'Ley 20.001 / DS 63', tema: 'Manejo Manual de Cargas (peso máximo 25 kg)', verificar: false },
  { id: 'codigo-trabajo-184', nombre: 'Código del Trabajo art. 184', tema: 'Deber general de protección y seguridad del empleador', verificar: false },
  { id: 'ley-21643', nombre: 'Ley 21.643 (Ley Karin)', tema: 'Prevención del acoso laboral, sexual y violencia en el trabajo', verificar: false },
]

export function getNorma(id: string): Norma | undefined {
  return NORMAS.find(n => n.id === id)
}

// Texto listo para mostrar/citar, uniendo varios ids de norma.ts
export function formatearNormas(ids: string[]): string {
  return ids
    .map(id => {
      const n = getNorma(id)
      if (!n) return id
      return n.verificar ? `${n.nombre} (verificar versión vigente)` : n.nombre
    })
    .join(' y ')
}
