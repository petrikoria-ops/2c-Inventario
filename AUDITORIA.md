# Auditoría UX/UI/Accesibilidad/Rendimiento — 2C Inventario

**Proyecto**: `2c-inventario-next` (Next.js 14 · Supabase · Tailwind) — rama `restructura-departamentos`
**Fecha**: 2026-08-12
**Método**: lectura directa de código fuente (rutas, componentes, `globals.css`, `tailwind.config.ts`), conteo cuantitativo por `grep` de patrones (hex arbitrarios, `aria-label`, clases de color), cálculo manual de contraste WCAG sobre los pares de color reales del proyecto, y auditoría **Lighthouse real** ejecutada dos veces: contra `npm run dev` (localhost:3000) y contra el **build de producción** (`npm run build && npm start`, localhost:3001), ambas sobre `/login` — la única ruta accesible sin sesión (el resto vive detrás de `middleware.ts`).

> Cada hallazgo cita el archivo/línea donde se verificó y el estándar de la tabla 1.2. No se listan problemas genéricos de plantilla: todo lo que sigue fue confirmado leyendo este código o corriendo Lighthouse contra él.

---

## 1.1 Inventario estructural

### Rutas (`app/`) por área funcional

El propio código ya agrupa la navegación en 5 secciones (`components/layout/Sidebar.tsx:22-60`, objeto `NAV`). Uso esa misma taxonomía real — es más fiel que inventar una nueva:

| Área | Rutas | Notas |
|---|---|---|
| **Autenticación / Enrolamiento** | `/login`, `/solicitar-acceso`, `/pendiente-aprobacion` | Únicas rutas sin `Sidebar` (`AppShell.tsx:8`, array `SIN_SIDEBAR`) |
| **Principal / Cockpit** | `/` (home por departamento), `/dashboard` | `/` arma el "cockpit" leyendo `lib/departamentos/config.ts` |
| **Inventario** | `/materiales`, `/herramientas`, `/herramientas/entregar`, `/herramientas/entregas/[id]/imprimir`, `/trabajadores`, `/movimientos`, `/importar`, `/salidas`, `/salidas/nueva`, `/salidas/[id]/imprimir`, `/entregas/nueva` | 11 rutas — el área más grande |
| **Gestión (Proyectos y Compras)** | `/proyectos`, `/proyectos/[id]/factibilidad`, `/proveedores`, `/solicitudes`, `/solicitudes/nueva`, `/solicitudes/[id]/imprimir`, `/solicitudes/importar` | |
| **Recursos** | `/recursos`, `/checklist`, `/etiquetas`, `/agente` | Únicas 100% client-side sin tabla de BD (`recursos`, `checklist`) |
| **Administración** | `/admin/solicitudes`, `/admin/errors` | Solo visibles para `admin_software`/`master` |

**29 páginas** (`page.tsx`) + **40 API routes** (`route.ts`) bajo `app/api/`, distribuidas en los mismos dominios (`/api/materiales*`, `/api/herramientas*`, `/api/salidas*`, `/api/proyectos*`, `/api/solicitudes*`, `/api/importar*`, `/api/admin*`, `/api/agente`, `/api/ver-como`, `/api/log-error`).

Existe además una **segunda capa de segmentación** ortogonal a las áreas de arriba: 7 **departamentos** (Bodega, Taller, Oficina Técnica, Prevención, RRHH, Directiva, Admin. de software) definidos en `lib/departamentos/config.ts`, cada uno con su propio subconjunto de acciones/herramientas filtradas por `puedeVer()`. Es decir: **el requisito 2.2 del rediseño ("cada área con su propio color de acento, KPIs e identidad") ya está implementado**, no es una carencia — ver sección "Fortalezas".

### Inventario de componentes (`components/`, 35 archivos `.tsx`)

| Carpeta | Componentes | Rol |
|---|---|---|
| `ui/` | `Modal`, `Badge` (4 variantes), `ConfirmDangerModal`, `PageLoading`, `CountUp`, `Reveal` | Primitivas de sistema de diseño — **ya existen**, pero conviven con estilos inline sueltos en el resto del código (ver 1.3) |
| `layout/` | `Sidebar`, `AppShell`, `VerComoSelector` | Navegación global |
| `hub/` | `CockpitHeader`, 6× `Widget<Departamento>` | Home por departamento |
| `materiales/` | `TablaMateriales` (~900 líneas) | **Módulo de referencia** (así lo llama `CLAUDE.md:54`) — el más completo en permisos, estados y accesibilidad |
| `herramientas/`, `movimientos/`, `salidas/`, `entregas/`, `trabajadores/`, `proyectos/`, `proveedores/`, `solicitudes/`, `importar/`, `etiquetas/`, `agente/`, `admin/`, `dashboard/` | 1-4 componentes c/u (tablas + formularios) | Réplicas del patrón de Materiales con distinto nivel de detalle |

**Formularios/tablas auditados directamente**: `TablaMateriales.tsx`, `NuevaSalida.tsx`, `Modal.tsx`, `ConfirmDangerModal.tsx`, `Badge.tsx`, `Sidebar.tsx`, `AppShell.tsx`, `ToastContext.tsx`, `app/page.tsx`, `app/layout.tsx`, `globals.css`, `tailwind.config.ts`.

---

## 1.2 Evaluación contra estándares

| Dimensión | Estándar | Resultado medido/observado |
|---|---|---|
| Usabilidad | 10 Heurísticas de Nielsen (nngroup.com) | Ver 1.3 — fallos puntuales en heurística 1 (visibilidad de estado del sistema en toasts) y 6 (reconocer antes que recordar, resuelto en la mayoría de las tablas) |
| Accesibilidad | WCAG 2.2 AA (w3.org/TR/WCAG22) | **Lighthouse Accessibility: 94/100** en ambos builds. 2 auditorías en score 0: `color-contrast` y `landmark-one-main` — detalle abajo |
| Rendimiento | Core Web Vitals (web.dev/vitals) | **Build de producción: Performance 100/100** — LCP 0.6s, CLS 0.001, TBT 0ms (excelente, ver tabla de métricas). El servidor `dev` da 43/100, pero eso es ruido esperado de código sin minificar — **no usar esos números como diagnóstico** |
| Jerarquía visual / espaciado | Grilla 8pt, escala tipográfica modular (material.io M3, refactoringui.com) | Tokens de sombra/radio SÍ existen (`globals.css:16-25`) y respetan "máx. 3 niveles". Escala tipográfica y grilla de espaciado **no** están documentadas — ver 1.3 |
| Patrones UI de dashboards | data tables, filtros, empty states (m3.material.io, ui-patterns.com) | `TablaMateriales` ya implementa: numérico alineado a la derecha (`.td-r`), header sticky, empty state contextual, carga progresiva con `IntersectionObserver`. Confirmar que el resto de tablas replique el mismo nivel — no verificado 1:1 en las 8 restantes por alcance de esta auditoría |
| Leyes de percepción | Fitts, Hick, Gestalt (lawsofux.com) | Menú móvil con botón de 44×44px aprox. en esquina superior izquierda (zona de pulgar subóptima en pantallas grandes, Fitts); agrupación por secciones en sidebar ya aplica proximidad (Gestalt) correctamente |

---

## 1.3 Diagnóstico — hallazgos con severidad

### 🔴 CRÍTICO

**1. Contraste de color insuficiente en texto secundario — sistemático, toda la app**
- **Evidencia**: Lighthouse (`color-contrast`, score 0) señala explícitamente `<label class="label" for="login-email">` y `<a class="... text-slate-400 ...">` en `/login`. Cálculo manual confirma:
  - `.label` (`globals.css:202-205`, color `#909090` sobre blanco) → **3.19:1**
  - `.text-slate-400` de Tailwind (`#94A3B8` sobre blanco) → **2.56:1**
  - Ambos muy por debajo del mínimo **4.5:1** para texto normal (WCAG 2.2 §1.4.3)
- **Alcance**: `.label` se usa en **todos los formularios de la app** (todo campo de Materiales, Salidas, Solicitudes, Trabajadores, etc. — decenas de instancias). `text-slate-400` aparece en **129 ocurrencias en 36 archivos** (grep), usado para descripciones de tarjetas (`accion-card`, `tool-card` en `app/page.tsx:176,216`), subtítulos y enlaces secundarios.
- **Por qué es crítico**: no es un detalle aislado — es el color por defecto para "todo lo secundario" en la app entera, afectando la legibilidad de cada etiqueta de campo y cada descripción de acceso rápido.
- **Fuente**: WCAG 2.2 §1.4.3 Contrast (Minimum), confirmado por Lighthouse `color-contrast`.

### 🟠 ALTO

**2. Sistema de color con tokens definidos pero sistemáticamente ignorados**
- **Evidencia**: `globals.css` y `tailwind.config.ts` sí definen tokens (`--c-carbon`, `--c-gold`, `--c-muted`, colores `brand.*`), pero un `grep` de valores hex de 6 dígitos cuenta **151 ocurrencias en 31 archivos de `components/`** y **225 en 16 archivos de `app/`** — 376 hex literales inline (`style={{ color: '#909090' }}`, `style={{ borderColor: '#E8EAED' }}`, etc.) en vez de consumir la variable/token ya existente.
- **Además**: los 11 colores de acento por departamento viven hardcodeados en un objeto plano (`lib/departamentos/config.ts:62-66`, objeto `A`) sin fórmula de derivación desde el primario ni verificación de contraste — algunos (`A.gold: '#C9A000'`, `A.ambar: '#D97706'`) se usan como fondo de icono con texto/ícono blanco encima (`app/page.tsx:161-165`) sin comprobar si superan 3:1 (mínimo para elementos gráficos, WCAG §1.4.11).
- **Fuente**: refactoringui.com (disciplina de tokens), WCAG 2.2 §1.4.11 Non-text Contrast.

**3. Botones de solo-ícono sin nombre accesible fuera del módulo de referencia**
- **Evidencia**: `aria-label` aparece solo **23 veces en 11 de los 71 archivos** de `app/`+`components/`. `TablaMateriales.tsx` sí lo aplica correctamente en sus 4 `btn-icon` (líneas 507-522), pero la mayoría de los demás módulos (con botones `btn-icon` equivalentes) no lo replican.
- **Fuente**: WCAG 2.2 §4.1.2 Name, Role, Value.

**4. Las 3 páginas del flujo de autenticación no tienen ningún landmark `<main>`**
- **Evidencia**: Lighthouse `landmark-one-main` score 0 en `/login`. Causa confirmada en código: `AppShell.tsx:8,25` excluye del wrapper a `SIN_SIDEBAR = ['/login', '/solicitar-acceso', '/pendiente-aprobacion']` y para esas rutas retorna `<>{children}</>` — un fragment sin `<main>`. `app/login/page.tsx:33` efectivamente solo tiene un `<div>` suelto. El resto de la app (todo lo que pasa por `AppShell.tsx:37`) sí tiene `<main>` correctamente. Tampoco existe un skip-link a contenido en ninguna parte del repo (0 resultados de "skip"/`role="main"` por `grep`), lo que importa especialmente en las páginas con `Sidebar` donde un usuario de teclado debe tabular todo el menú antes de llegar al contenido.
- **Fuente**: WCAG 2.2 §2.4.1 Bypass Blocks.

**5. Toasts sin rol accesible ni control de tiempo**
- **Evidencia**: `contexts/ToastContext.tsx:38-45` — el contenedor de toasts no tiene `role="status"` ni `aria-live`, por lo que un lector de pantalla no anuncia los mensajes de éxito/error de cada acción. Se auto-descartan a los 3000ms fijos (línea 25) sin botón de cierre ni pausa al pasar el mouse/foco.
- **Fuente**: WCAG 2.2 §4.1.3 Status Messages y §2.2.1 Timing Adjustable; Heurística de Nielsen #1 (visibilidad del estado del sistema) parcialmente cubierta pero no persistente para quien no llega a leerla a tiempo.

**6. Escala tipográfica no documentada — valores arbitrarios**
- **Evidencia**: en los archivos leídos aparecen tamaños de fuente entre corchetes sin relación entre sí: `text-[10px]`, `text-[10.5px]`, `text-[11px]`, `text-[13px]`, `text-[15px]` (`globals.css`, `Sidebar.tsx`, `Modal.tsx`, `TablaMateriales.tsx`) — no siguen una progresión modular (ej. 12/14/16/20/24/32 pedida en el estándar).
- **Además**: `body` fija `font-size: 0.875rem` (14px) globalmente (`globals.css:33`), y `.input` hereda ese tamaño (13px reales por `text-[13px]` en `globals.css:207`) — por debajo del umbral de 16px que evita el auto-zoom de iOS Safari al enfocar un campo.
- **Fuente**: refactoringui.com (escala tipográfica), web.dev (convención de 16px en inputs para evitar zoom no intencional).

### 🟡 MEDIO

**7. Espaciado fuera de la grilla estricta de 8pt**
- **Evidencia**: uso extendido de valores intermedios de Tailwind — `gap-2.5` (10px), `py-1.5` (6px), `px-3.5` (14px) en `globals.css` (`.btn`, `.panel-header`, `.filters`) — múltiplos de 2px, no de 8px.
- **Severidad media** porque es una refinación deliberada de densidad de información (común en dashboards), no un error, pero no está documentada como excepción consciente.
- **Fuente**: material.io M3 (grilla base 8dp con sub-unidades de 4dp documentadas explícitamente — aquí no hay documentación de la excepción).

**8. Dos escalas de "gris apagado" conviviendo sin reconciliar**
- **Evidencia**: `--c-muted: #909090` (CSS var, `globals.css:13`) y la paleta `slate` de Tailwind (`text-slate-400/500/600`, usados directamente en `TablaMateriales.tsx`, `app/page.tsx`, `NuevaSalida.tsx`) coexisten como si fueran el mismo propósito, con contraste distinto entre sí.
- **Fuente**: refactoringui.com (una sola escala neutra por sistema).

**9. Tokens de radio definidos pero no usados como fuente única**
- **Evidencia**: `--radius-sm/md/lg` existen (`globals.css:23-25`) pero casi ningún componente los referencia — se usa directamente `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` de Tailwind en paralelo (`Modal.tsx:39`, `globals.css` `.panel`, `.accion-card`, `.tool-card`).
- **Fuente**: material.io M3 (single source of truth de tokens).

**10. Color de categoría definido por el usuario sin verificación de contraste**
- **Evidencia**: `TablaMateriales.tsx:494` — `style={{ background: cat.color + '22', color: cat.color }}` usa el color hex que el usuario eligió libremente al crear la categoría, tanto de fondo (con 13% opacidad) como de texto, sin clamping de luminosidad. Si alguien elige un color claro (ej. amarillo pálido), la etiqueta puede quedar prácticamente ilegible.
- **Fuente**: WCAG 2.2 §1.4.3, aplicado a contenido generado por el usuario.

---

## Fortalezas a preservar (no rediseñar desde cero)

El rediseño **no debe destruir** lo siguiente, ya construido y alineado con los estándares pedidos:

- **Core Web Vitals en producción: 100/100** — LCP 0.6s, CLS 0.001, TBT 0ms (medido con Lighthouse contra `next build && next start`). Next/font con `display: swap`, imágenes con dimensiones fijas, sin bloqueo de render significativo.
- **Inmersión por área ya implementada**: `lib/departamentos/config.ts` + `CockpitHeader` + acento por color + KPIs (`CountUp`) — es exactamente el patrón pedido en 2.2, solo falta que los acentos vengan de una fórmula del sistema en vez de hex sueltos (hallazgo #2).
- **Estados de tabla resueltos en el módulo de referencia**: loading (`PageLoading.tsx` + `loading.tsx` por ruta), empty state contextual (con/sin filtros), carga progresiva con `IntersectionObserver` (`hooks/useProgressiveList.ts`) — cubre el requisito de "skeleton/paginación" sin re-arquitectura.
- **Confirmación reforzada en acciones destructivas** (`ConfirmDangerModal.tsx`): exige escribir una palabra exacta, no solo un "Aceptar" — ya excede el estándar pedido en 2.3, y además documenta *por qué* (`ConfirmDangerModal.tsx:18-19`, referencia a un incidente real de borrado masivo).
- **`prefers-reduced-motion` respetado globalmente** (`globals.css:371-378`).
- **Foco de teclado visible y consistente** vía `:focus-visible` con outline de marca (`globals.css:43-47`).
- **Números alineados a la derecha en tablas** (`.td-r`) ya es el patrón estándar en Materiales.
- **Toasts sí existen** (`ToastContext`) — solo falta accesibilidad de anuncio (hallazgo #5), no hay que construir el sistema desde cero.

---

## Métricas Lighthouse medidas

| | Dev server (`npm run dev`) | **Build producción** (`npm run build && npm start`) |
|---|---|---|
| Performance | 43 | **100** |
| Accessibility | 94 | 94 |
| Best Practices | 100 | 100 |
| SEO | 92 | 92 |
| LCP | 19.0s ⚠️ (no representativo) | **0.6s** |
| CLS | 0 | 0.001 |
| TBT | 2,850ms ⚠️ (no representativo) | **0ms** |

**Nota metodológica**: los números de `dev` se incluyen solo para transparencia — Next.js no minifica ni divide código en modo desarrollo, así que ese build nunca debe usarse para diagnosticar rendimiento real. La columna de producción es la que importa y ya cumple sobradamente los umbrales de Core Web Vitals (LCP <2.5s, CLS <0.1). Pendiente: repetir la medición sobre rutas autenticadas pesadas (`/materiales`, `/dashboard`) con una sesión guardada, y sobre `/solicitudes/importar` (233 KB de First Load JS por la librería `xlsx` — candidato a `dynamic import`).

---

## Alcance de esta auditoría

Se leyó y verificó directamente: `globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `components/layout/{Sidebar,AppShell}.tsx`, `components/ui/{Modal,Badge,ConfirmDangerModal,PageLoading}.tsx`, `components/materiales/TablaMateriales.tsx`, `components/salidas/NuevaSalida.tsx`, `contexts/ToastContext.tsx`, `lib/departamentos/config.ts`, más los conteos por `grep` ya citados y dos corridas de Lighthouse. **No** se leyeron línea por línea los 29 archivos de página ni los 35 componentes — los hallazgos de alcance "sistemático" están respaldados por conteos cuantitativos (grep) sobre todo el árbol, pero la revisión visual detallada del resto de tablas/formularios queda pendiente para cuando se aborde cada área en la Fase 2.
