# Sistema de Diseño — 2C Inventario

Fuente única de verdad de tokens. Todo componente nuevo o rediseñado consume **solo** estos valores — cero hex sueltos, cero tamaños entre corchetes inventados por pantalla.

Implementado en `app/globals.css` (`:root`) y `tailwind.config.ts`. No es un sistema desde cero: **reutiliza y formaliza** lo que ya existía (Carbon, Gold, Inter, radios, sombras) y agrega solo lo que la auditoría (`AUDITORIA.md`) encontró faltante: escala neutra completa con contraste verificado, escala tipográfica modular y tokens semánticos.

---

## Color

### Primario y marca (ya existían — sin cambios)
| Token | Hex | Uso |
|---|---|---|
| `--c-gold` | `#F0C000` | Acción primaria, activo en nav, foco |
| `--c-gold-dark` | `#C9A000` | Hover de primario |
| `--c-carbon` | `#2E333A` | Sidebar, texto de máximo énfasis, botón secundario |
| `--c-carbon-light` | `#3D4450` | Hover sobre carbon |

### Neutro — escala 50→900 (nueva, reemplaza el par `#909090` / `slate-*` mezclado sin criterio)
Cada paso indica **dónde puede usarse como texto** — es la regla que faltaba y que causó el hallazgo crítico #1 de la auditoría (contraste 3.19:1 y 2.56:1, por debajo de 4.5:1).

| Token | Hex | Contraste sobre blanco | Uso permitido |
|---|---|---|---|
| `--n-50` | `#F5F6F7` | — | Fondo de página (ya era `--c-bg`) |
| `--n-100` | `#ECEEF1` | — | Fondos de fila hover, chips |
| `--n-200` | `#E2E4E7` | — | Bordes de panel/tabla |
| `--n-300` | `#D8D8D8` | — | Bordes de input, divisores fuertes |
| `--n-400` | `#AEB2B8` | 2.3:1 — **nunca como texto** | Iconos decorativos, placeholder, disabled |
| `--n-500` | `#6B7480` | **4.83:1 — mínimo AA** | Texto secundario, labels, descripciones — reemplaza `#909090` y `text-slate-400` |
| `--n-600` | `#4B5563` | 7.1:1 | Texto secundario con más énfasis |
| `--n-700` | `#374151` | 9.7:1 | Texto de cuerpo alternativo sobre fondos claros |
| `--n-800` | `#2E333A` | 12.9:1 | Texto principal (= `--c-carbon`, mismo valor) |
| `--n-900` | `#181818` | 15.8:1 | Titulares de máximo contraste |

**Regla de aplicación**: ningún texto sobre fondo blanco/`--n-50` puede usar `--n-400` o más claro. `--n-500` es el piso legal para texto — no `#909090` ni `slate-400`. Esto es una corrección directa y de bajo riesgo: mismo tono percibido, contraste corregido.

### Semánticos (formalizan lo que ya se usaba de forma ad hoc con clases Tailwind sueltas)
| Token | Fondo | Texto | Contraste | Uso |
|---|---|---|---|---|
| `--sem-success-bg` / `--sem-success-fg` | `emerald-50` | `emerald-800` | >7:1 | Badges/alerts de éxito, stock OK |
| `--sem-error-bg` / `--sem-error-fg` | `red-50` | `red-800` | >7:1 | Errores, stock cero, eliminar |
| `--sem-warning-bg` / `--sem-warning-fg` | `amber-50` | `amber-800` | >7:1 | Bajo mínimo, en reparación |
| `--sem-info-bg` / `--sem-info-fg` | `blue-50` | `blue-800` | >7:1 | Ajustes, informativo |

### Acentos de departamento — misma paleta, ahora con regla de contraste explícita
Los 11 acentos de `lib/departamentos/config.ts` (objeto `A`) se mantienen (son intencionales, uno por área, y ya se usan en icon-chips y gradientes de cabecera) pero quedan sujetos a una regla nueva: **todo acento que se use como fondo de ícono con glifo blanco encima debe superar 3:1** (WCAG §1.4.11, elementos no textuales). De los 11 valores actuales, verificar especialmente `A.gold`/`A.ambar` en fondo claro — pendiente de aplicar como parte del rediseño de Home/Cockpit.

---

## Tipografía

**Familia**: Inter — sin cambios, ya cargada vía `next/font` con pesos 400/500/600/700 (`app/layout.tsx:9-14`). Es la única familia UI del proyecto; se mantiene.

### Escala modular (nueva — reemplaza los `text-[10px]`, `[10.5px]`, `[11px]`, `[13px]`, `[15px]` sueltos)
| Token | Tamaño | Uso |
|---|---|---|
| `--fs-xs` | 12px | Metadata, badges, timestamps |
| `--fs-sm` | 14px | Texto secundario, celdas de tabla, botones |
| `--fs-base` | **16px** | Cuerpo, inputs, labels — **antes 14px global** (hallazgo #6: bajo el umbral de 16px que evita el auto-zoom de iOS Safari en inputs) |
| `--fs-lg` | 20px | Títulos de sección, `panel-header h2` |
| `--fs-xl` | 24px | Títulos de página |
| `--fs-2xl` | 32px | Hero del cockpit (`CockpitHeader`) |

Pesos: `400` texto normal · `500` énfasis leve (labels activos) · `600` semibold (botones, headers de tabla, nav activo) · `700` bold (títulos).

---

## Espaciado

Escala 4-8-12-16-24-32-48-64 (múltiplos de 4/8, ya es la escala nativa de Tailwind: `1=4px 2=8px 3=12px 4=16px 6=24px 8=32px 12=48px 16=64px`). Componentes nuevos deben usar **solo** estos pasos.

**Excepción documentada** (antes no documentada — hallazgo medio #7): los valores intermedios `1.5` (6px), `2.5` (10px), `3.5` (14px) que ya existen en `.btn`, `.filters`, `.panel-header` se mantienen como *sub-grid de densidad* para UI compacta (tablas, barras de filtro), pero quedan excluidos de componentes nuevos de mayor jerarquía (cards, headers, modales) — ahí se usa siempre la escala principal.

---

## Radios y sombras (ya existían — sin cambios, ya cumplían "máx. 3 niveles")

| Radio | Valor | Uso |
|---|---|---|
| `--radius-sm` | 8px | Inputs, botones, badges |
| `--radius-md` | 12px | Cards pequeñas, tool-card |
| `--radius-lg` | 18px | Panels grandes, cockpit-hero, modal |

| Sombra | Uso |
|---|---|
| `--shadow-sm` | Reposo — panels, stat-cards, accion-card |
| `--shadow-md` | Hover — elevación al pasar el cursor |
| `--shadow-lg` | Modales, cockpit-hero, hover de accion-card |

**Regla nueva** (hallazgo medio #9): dejar de usar `rounded-lg/xl/2xl` de Tailwind directo en componentes nuevos — consumir `var(--radius-*)` siempre que el valor coincida, para que quede un único lugar donde cambiar la curvatura de toda la app.

---

## Componentes — contrato (sin cambios de API, solo de origen de valores)

Las clases ya existentes en `globals.css` (`.btn*`, `.input`, `.label`, `.badge*`, `.panel*`, `.th`/`.td`/`.td-r`, `.alert*`, `.stat-card`, `.accion-card`, `.tool-card`) **se mantienen** — son el inventario de componentes pedido en 2.3 y ya cubren tablas con estados, formularios con labels visibles y feedback. El rediseño por área consume estas clases, no las reinventa; donde una clase tenga un valor que viola un token (ej. `.label` con `#909090`), se corrige el valor dentro de la misma clase, no se crea una clase nueva.

---

## Qué se aplicó ya vs. qué queda para el rediseño por área

**Aplicado en esta sesión** (fundacional, bajo riesgo, aditivo — no reestructura ningún componente): tokens de color neutro/semántico agregados a `globals.css`, corrección de contraste en `.label` y color base del texto secundario, tamaño base de fuente subido a 16px. Detalle en `CHANGELOG_REDISENO.md`.

**Pendiente — se hace de a un área por vez** (regla 2.4.4, no big-bang): migrar cada tabla/formulario para que sus `text-slate-400`/hex sueltos usen los tokens nuevos, agregar `aria-label` a los `btn-icon` que faltan por módulo, envolver toasts con `role="status"`, y decidir con el usuario el orden de áreas a intervenir.
