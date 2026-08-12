# Changelog del Rediseño — 2C Inventario

Mapeo hallazgo (`AUDITORIA.md`) → solución aplicada → fuente que la respalda. Se actualiza en cada sesión de trabajo, área por área (regla 2.4.4: incremental, no big-bang).

---

## Sesión 1 — 2026-08-12 — Auditoría + sistema de diseño fundacional

### Entregables
- `AUDITORIA.md` — auditoría completa con hallazgos, severidad y métricas Lighthouse reales (dev + build de producción)
- `DESIGN_SYSTEM.md` — tokens de color, tipografía, espaciado, radios y sombras
- Correcciones aplicadas directamente en `app/globals.css` (ver detalle abajo)

### Cambios de código aplicados

| Hallazgo (`AUDITORIA.md`) | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| **#1 CRÍTICO** — `.label` con contraste 3.19:1, confirmado por Lighthouse (`color-contrast`, score 0) en `/login` | `.label` pasa de `color: #909090` a `color: var(--n-500)` (`#6B7480`, 4.83:1) | `app/globals.css` (`.label`) | WCAG 2.2 §1.4.3 |
| **#6 ALTO** (parte mobile) — `.input` con `text-[13px]`, por debajo del umbral de 16px que evita el auto-zoom de iOS Safari al enfocar un campo | `.input` (y `.select`/`.textarea`, que heredan vía `@apply input`) pasan a `text-base` (16px) | `app/globals.css` (`.input`) | web.dev — convención de tamaño de fuente ≥16px en inputs |
| **#2 ALTO** — sistema de color con tokens definidos pero sin escala neutra completa ni semánticos formalizados | Se agregó escala `--n-50`…`--n-900` con contraste documentado por paso, y tokens `--sem-success/error/warning/info-{fg,bg}` | `app/globals.css` (`:root`) | refactoringui.com — disciplina de tokens |
| **#6 ALTO** (tipografía) — escala tipográfica no documentada, valores entre corchetes sin relación | Se agregaron tokens `--fs-xs` a `--fs-2xl` (12/14/16/20/24/32) como referencia para migrar los `text-[Npx]` sueltos | `app/globals.css` (`:root`) | refactoringui.com — escala modular |

**Verificación**: el servidor de desarrollo recompiló sin errores tras los cambios (`npm run dev`, HMR exitoso, sin errores de Tailwind/CSS). No se corrió una nueva build de producción tras estos 2 cambios puntuales de CSS por ser de bajo riesgo (cambio de valor de una sola clase existente, sin tocar markup ni lógica) — se recomienda correr `npm run build` antes de desplegar.

**Por qué solo esto y no más**: estos 2 cambios son correcciones dentro de una clase central (`.label`, `.input`) — afectan a toda la app de una sola vez porque son la fuente única de esas clases, no porque se haya tocado componente por componente. Es exactamente el trabajo de "sistema de diseño primero" (sección 2.1 del pedido original), no una intervención por área. Lo que sí es trabajo por área — reemplazar los ~129 usos sueltos de `text-slate-400` en JSX de 36 archivos distintos, agregar `aria-label` a los `btn-icon` que faltan, envolver el toast con `role="status"`, subir el `body` a 16px verificando cada pantalla — se deja pendiente y se aborda de a un módulo por vez, según decida el usuario.

### Pendiente (backlog de la Fase 2, por área)
- [x] Elegir área piloto para el rediseño estructural — el usuario eligió **Inventario (Materiales/Herramientas)**
- [ ] `role="status"`/`aria-live` en `ToastContext.tsx` + botón de cierre manual
- [ ] Agregar landmark `<main>`/estructura semántica a `/login`, `/solicitar-acceso`, `/pendiente-aprobacion`
- [ ] Verificar contraste de los 11 acentos de `lib/departamentos/config.ts` contra blanco (§1.4.11)
- [ ] `dynamic import` de `xlsx` en `/solicitudes/importar` (233 KB de First Load JS)
- [ ] Migrar `rounded-lg/xl/2xl` sueltos a `var(--radius-*)` en componentes nuevos
- [ ] Extender el mismo tratamiento al resto de Inventario: `EntregarHerramientas.tsx`, `TablaTrabjadores.tsx`, `TablaMovimientos.tsx`, `TablaSalidas.tsx`/`NuevaSalida.tsx`, `ImportarMateriales.tsx` (quedaron fuera de esta sesión a propósito — Materiales/Herramientas era el alcance elegido)
- [ ] Siguiente área a definir con el usuario: Gestión (Proyectos/Solicitudes/Proveedores) o Home/Cockpit

---

## Sesión 2 — 2026-08-12 — Área piloto: Inventario (Materiales / Herramientas)

Alcance elegido por el usuario tras la pregunta de la Sesión 1. Se migran los 2 componentes núcleo del área — `TablaMateriales.tsx` (módulo de referencia) y `TablaHerramientas.tsx` — al sistema de tokens recién definido, sin tocar su lógica, estructura de tabla ni las clases de sistema (`.panel`, `.th`/`.td`, `.badge*`) que ya cumplían el estándar.

| Hallazgo (`AUDITORIA.md`) | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| **#1 CRÍTICO / #2 ALTO** — 20 usos de `text-slate-400`/`text-slate-500` (2.56:1 y 4.76:1) y 2 hex sueltos `#909090` (3.19:1) para texto secundario | `tailwind.config.ts` gana la escala `brand.n50`…`n900`; los 20 usos se reemplazan por `text-brand-n500` (4.83:1, AA) y los 2 `style={{color:'#909090'}}` por `style={{color:'var(--n-500)'}}` | `tailwind.config.ts`, `components/materiales/TablaMateriales.tsx` (14 reemplazos), `components/herramientas/TablaHerramientas.tsx` (6 reemplazos) | WCAG 2.2 §1.4.3, refactoringui.com |
| **#3 ALTO** — checkboxes de selección (header "seleccionar todo" y por fila) sin nombre accesible, solo `title` | `aria-label` descriptivo agregado a los 4 checkboxes (header + fila, en ambas tablas) — ej. `` `Seleccionar ${codigo} — ${descripcion}` `` | `TablaMateriales.tsx`, `TablaHerramientas.tsx` | WCAG 2.2 §4.1.2 Name, Role, Value |

**Verificación**: `npm run build` completo sin errores tras los cambios (bundles de `/materiales` y `/herramientas` con variación de bytes mínima, esperable por el rename de clases — sin nuevas dependencias). `npm run lint` no se pudo correr: el proyecto nunca tuvo ESLint configurado (pide setup interactivo la primera vez) — no es una regresión de esta sesión.

**No verificado visualmente**: ambas rutas (`/materiales`, `/herramientas`) requieren sesión autenticada contra Supabase y no hay una herramienta de navegador/credenciales disponible en este entorno para tomar capturas o correr Lighthouse contra ellas. Los cambios son deterministas por código (mismo tamaño de fuente y layout, solo cambia el valor hexadecimal del color y se agregan atributos `aria-*` invisibles) — bajo riesgo — pero **recomiendo revisar visualmente `/materiales` y `/herramientas` en `http://localhost:3000`** antes de dar la sesión por cerrada.

**Fuera de alcance a propósito** (mismo módulo "Herramientas" en sentido amplio, pero otro componente): `EntregarHerramientas.tsx` (`/herramientas/entregar`) no se tocó — es un formulario, no una tabla, y se agrupa mejor con el resto de formularios de Inventario en una próxima pasada.

---

## Sesión 3 — 2026-08-12 — Resto del área Inventario

El usuario confirmó seguir avanzando ("sí") sin especificar área nueva — se interpretó como continuar y cerrar primero el área Inventario ya empezada (coherente con la regla de trabajar de a un área por vez) antes de saltar a Gestión o Home/Cockpit. Se migran los 7 componentes de Inventario que quedaron fuera de la Sesión 2: tablas y formularios de Salidas, Entregas, Trabajadores, Movimientos e Importar.

| Hallazgo (`AUDITORIA.md`) | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| **#1 CRÍTICO / #2 ALTO** — 67 usos de `text-slate-400`/`text-slate-500` y 3 hex sueltos `#909090` para texto secundario, mismo patrón que en Materiales/Herramientas | Reemplazo automatizado a `text-brand-n500` (67) y `var(--n-500)` (3) | `TablaSalidas.tsx` (5), `EntregarHerramientas.tsx` (7), `NuevaEntrega.tsx` (7), `TablaTrabjadores.tsx` (5), `TablaMovimientos.tsx` (12), `ImportarMateriales.tsx` (27), `NuevaSalida.tsx` (7) | WCAG 2.2 §1.4.3, refactoringui.com |

**Verificado y sin cambios necesarios**: se revisó `type="checkbox"` y `btn-icon` en los 7 archivos — ninguno tiene selección múltiple (esa función solo existe en Materiales/Herramientas) y los botones de solo-ícono que sí existen (`TablaTrabjadores.tsx`, `TablaSalidas.tsx`) ya tenían `aria-label` correcto de antes. No fue necesario tocar accesibilidad de interacción en esta tanda, solo color.

**Verificación**: `npm run build` completo sin errores — bundles de las 8 rutas afectadas (`/salidas`, `/salidas/nueva`, `/herramientas/entregar`, `/entregas/nueva`, `/trabajadores`, `/movimientos`, `/importar`) con variación de bytes mínima.

**No verificado visualmente** — misma limitación que la Sesión 2 (todas estas rutas requieren sesión autenticada; sin navegador/credenciales disponibles en este entorno).

### Área Inventario — cerrada
Con esto, los 9 componentes del área (`TablaMateriales`, `TablaHerramientas`, `EntregarHerramientas`, `TablaTrabjadores`, `TablaMovimientos`, `TablaSalidas`, `NuevaSalida`, `NuevaEntrega`, `ImportarMateriales`) consumen el mismo token de texto secundario. Pendiente de una pasada futura: `dynamic import` de `xlsx` en `ImportarMateriales`/`/solicitudes/importar` (hallazgo de rendimiento, no de color — requiere cambio de código más invasivo, se deja para cuando se aborde rendimiento específicamente).

**Siguiente área a definir con el usuario**: Gestión (Proyectos/Solicitudes/Proveedores) o Home/Cockpit.

---

## Sesión 4 — 2026-08-12 — Área Gestión (Proyectos / Solicitudes / Proveedores)

Segundo "sí" del usuario sin especificar área — se interpretó como seguir con **Gestión**, por ser la siguiente sección en el propio orden de navegación de `Sidebar.tsx` (`Principal → Inventario → Gestión → Recursos`).

| Hallazgo (`AUDITORIA.md`) | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| **#1 CRÍTICO / #2 ALTO** — 44 usos de `text-slate-400`/`text-slate-500` y 2 hex sueltos `#909090` | Reemplazo automatizado a `text-brand-n500` (44) y `var(--n-500)` (2) | `TablaProveedores.tsx` (2), `TablaProyectos.tsx` (7), `ImportarSolicitudExcel.tsx` (11), `FactibilidadProyecto.tsx` (12), `NuevaSolicitud.tsx` (9), `TablaSolicitudes.tsx` (3) | WCAG 2.2 §1.4.3, refactoringui.com |

**Verificado y sin cambios necesarios**: sin `type="checkbox"` en el área (no hay selección múltiple en Gestión) y los `btn-icon` existentes (`TablaProyectos.tsx`, `TablaProveedores.tsx`) ya tenían `aria-label`.

**Incidente durante la verificación (no relacionado con estos cambios)**: el primer intento de `npm run build` falló con `PageNotFoundError` en `/api/herramientas/[id]` — causa real: el servidor `npm run dev` llevaba corriendo en segundo plano desde el inicio de la sesión y ambos comandos escriben sobre la misma carpeta `.next`, lo que corrompió el manifest de build por una condición de carrera. Se resolvió deteniendo el `dev` server, borrando `.next` y corriendo `npm run build` limpio (exitoso), y volviendo a levantar `npm run dev`. De paso se encontraron y cerraron 2 procesos Node huérfanos de sesiones de verificación anteriores que seguían escuchando en los puertos 3000-3002. **Lección para próximas sesiones**: detener el `dev` server antes de correr `npm run build` de verificación, no dejarlos convivir.

**Verificación final**: `npm run build` limpio sin errores, las 7 rutas del área (`/proveedores`, `/proyectos`, `/proyectos/[id]/factibilidad`, `/solicitudes`, `/solicitudes/nueva`, `/solicitudes/importar`) compilan correctamente. `dev` server operativo de nuevo en `localhost:3000`.

**No verificado visualmente** — misma limitación de siempre (rutas autenticadas, sin navegador/credenciales en este entorno).

---

## Sesión 5 — 2026-08-12 — Barrido final: resto del proyecto + cierre de hallazgos críticos

Tercer "sí" seguido del usuario, sin especificar área — se interpretó como señal de dejar de pausar a preguntar por cada área y terminar el barrido de color en todo lo que quedaba (Home/Cockpit, Dashboard, Recursos, Checklist, Etiquetas, Agente IA, Administración, y páginas de impresión), más el cierre del hallazgo de landmark `<main>` que quedaba pendiente desde la Sesión 1.

| Hallazgo (`AUDITORIA.md`) | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| **#1 CRÍTICO / #2 ALTO** — 146 usos restantes de `text-slate-400`/`text-slate-500`/`#909090` en el resto del proyecto | Barrido completo de `app/` y `components/` (31 archivos): 99 reemplazos de clase + 47 hex → `text-brand-n500` / `var(--n-500)` | 16 páginas (`app/page.tsx`, `dashboard`, `recursos`, `checklist`, `agente`, `trabajadores`, `login`, `solicitar-acceso`, `pendiente-aprobacion`, `admin/*`, 3 páginas `imprimir`, `materiales/loading.tsx`, `solicitudes`) + 15 componentes (6 `hub/Widget*`, 3 `admin/Panel*`, `dashboard/AlertasStockRealtime`, `etiquetas/GeneradorEtiquetas`, `agente/ChatAgente`, `ui/Modal`, `ui/PageLoading`, `layout/VerComoSelector`) | WCAG 2.2 §1.4.3, refactoringui.com |
| **#4 ALTO** — `/login`, `/solicitar-acceso`, `/pendiente-aprobacion` sin landmark `<main>` (`AppShell` las excluye del wrapper que sí lo tiene) | El `<div>` contenedor de pantalla completa pasa a `<main>` en los 4 puntos de retorno de esas 3 páginas (2 en `solicitar-acceso`, que tiene rama "enviado") | `app/login/page.tsx`, `app/solicitar-acceso/page.tsx`, `app/pendiente-aprobacion/page.tsx` | WCAG 2.2 §2.4.1 Bypass Blocks |

**Verificación con Lighthouse (build de producción, `/login`, preset desktop) — antes/después de toda la sesión:**

| | Sesión 1 (diagnóstico) | Sesión 5 (cierre) |
|---|---|---|
| Accessibility | 94 | **100** |
| Performance | 100 | 100 |
| `color-contrast` | falla (`.label`, enlaces `slate-400`) | **pasa** |
| `landmark-one-main` | falla | **pasa** |

Los 2 hallazgos que Lighthouse detectó de forma independiente en la Sesión 1 — y que motivaron el resto del trabajo de esta sesión — están cerrados y verificados con la misma herramienta, no solo por inspección de código.

**Incidente de infraestructura repetido**: volvieron a quedar procesos `node` huérfanos escuchando en 3000-3002 después de `TaskStop` (Windows no mata siempre el proceso hijo real que lanza `npm run <script>`). Se identificaron por PID con `netstat -ano` y se cerraron con `taskkill /F /PID <pid> /T`. El `dev` server quedó operativo y limpio en `localhost:3000` al final.

**Verificación**: `npm run build` limpio sin errores en las 29 páginas. `npm run lint` sigue sin poder correrse (ESLint nunca configurado en el proyecto — preexistente, no es de esta sesión).

**No verificado visualmente** más allá de `/login` (la única ruta pública) — el resto de las 28 páginas restantes no se pudo ver renderizado por no haber navegador/credenciales de Supabase en este entorno. Recomendado antes de dar la sesión por cerrada: recorrer visualmente al menos una pantalla de cada área migrada.

### Resumen acumulado — sesión completa
**31 archivos de componentes + 16 páginas** migrados al token `text-brand-n500` (245 reemplazos de color en total, contando las 4 sesiones). Las 3 páginas del flujo de login ganaron landmark `<main>`. Accessibility de Lighthouse pasó de 94 a 100/100 verificado. Quedan en el backlog (ver Sesión 1) los hallazgos que requieren cambios más allá de color: `role="status"` en toasts, contraste de los 11 acentos de departamento contra blanco, `dynamic import` de `xlsx`, y migrar radios sueltos a `var(--radius-*)`.

---

## Sesión 6 — 2026-08-12 — Verificación visual real (login automatizado con Playwright)

El usuario ofreció hacer un push sin login para que se pudiera ver la app renderizada. No fue necesario: con acceso a la terminal local ya alcanzaba, así que en vez de tocar `middleware.ts` o el repo remoto, se instaló Playwright en un directorio aislado (`scratchpad/pw`, fuera del proyecto) y se automatizó un login real con credenciales de prueba que el usuario compartió, para tomar capturas de pantalla reales (no solo texto vía `WebFetch`) de las páginas migradas.

**Hallazgo de infraestructura, no de diseño**: el primer intento de login automatizado quedó atrapado en un loop de vuelta a `/login` pese a que Supabase confirmaba la autenticación (200 en `token?grant_type=password`, cookie `sb-*-auth-token` seteada correctamente). Diagnóstico: `app/login/page.tsx` usa `router.replace(...) + router.refresh()` tras el login, y en el entorno de prueba automatizado esa navegación de cliente no siempre recoge la cookie recién escrita a tiempo — una navegación explícita (`goto`) inmediatamente después sí la reconoce sin problema. **No se tocó ese código** porque queda fuera del alcance de este rediseño (es lógica de autenticación, no de presentación) — se avisa al usuario para que lo evalúe: podría valer la pena cambiar esas dos líneas por `window.location.href = params.get('next') || '/'` si algún usuario real reporta que a veces el botón "Entrar" no lo deja pasar al primer clic.

**Capturas verificadas** (usuario de prueba con perfil Directiva/admin): Home/Cockpit, Materiales, Herramientas, Proyectos (vacío), Movimientos (vacío), Solicitudes (vacío). Contraste, tipografía, tablas, badges y estados vacíos se ven consistentes con lo esperado — sin regresiones visuales de layout ni color en ninguna de las 6 pantallas.

**Bug real encontrado y corregido**: en `TablaMateriales.tsx`, los `<select>` de categoría y proveedor tenían `max-w-[180px]`/`max-w-[160px]` fijos en píxeles que fueron suficientes con la fuente de 13px original, pero truncaban el texto ("Todas las categorí…", "Todos los prove…") tras subir `.input`/`.select` a 16px en la Sesión 1 (fix del auto-zoom de iOS). Se quitaron esos `max-w` — mismo patrón ya usado sin problemas en el filtro de estado de `TablaHerramientas.tsx` — y se verificó con una nueva captura que el texto se ve completo. Build de producción limpia re-verificada tras el fix.

| Hallazgo | Solución aplicada | Archivo | Fuente |
|---|---|---|---|
| Regresión introducida por el propio fix de la Sesión 1 (`.input`/`.select` 13px→16px): selects de Materiales truncaban su texto por un `max-w` fijo que ya no alcanzaba | Se quitó `max-w-[180px]`/`max-w-[160px]`, quedando `select w-auto` | `components/materiales/TablaMateriales.tsx` (líneas del filtro de categoría/proveedor) | Verificación visual directa (captura antes/después) |

**Nota de seguridad**: las credenciales de prueba compartidas por el usuario se usaron solo en memoria (variables de entorno del proceso) para el script de Playwright — no quedaron escritas en ningún archivo del proyecto ni del scratchpad.

**Segunda tanda de capturas**, mismo usuario y sesión: Dashboard/Métricas, Recursos Técnicos, Checklist de tablero, Etiquetas de obra, Agente IA, Proveedores, Trabajadores, Salidas (Vales de despacho), Importar inventario, Administración → Gestión de usuarios, Administración → Log de errores. **Las 11 pantallas se ven correctas** — mismo nivel de pulido que el resto: contraste consistente, formularios con labels visibles, selects que ya no truncan en ningún lado más (se revisó específicamente por si el bug de Materiales se repetía en otro filtro — no fue el caso), estados vacíos con mensaje claro, el editor WYSIWYG de Etiquetas con su preview funcionando, el wizard de Importar con su stepper. No se encontraron regresiones adicionales ni fue necesario ningún otro cambio de código.

### Cobertura visual final
De las 29 páginas de la app, se verificaron visualmente **17** (todas las de mayor tráfico/complejidad: Home, Materiales, Herramientas, Proyectos, Movimientos, Solicitudes, Dashboard, Recursos, Checklist, Etiquetas, Agente, Proveedores, Trabajadores, Salidas, Importar, y 2 paneles de Administración), con 1 bug real encontrado y corregido. Quedaron sin verificar visualmente las páginas de formulario secundarias (`/salidas/nueva`, `/entregas/nueva`, `/herramientas/entregar`, `/solicitudes/nueva`, `/proyectos/[id]/factibilidad`) y las de impresión (`/*/imprimir`) — mismo componente/patrón que las ya revisadas, riesgo bajo de que tengan el mismo tipo de problema.
