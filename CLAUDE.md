# 2C Inventario — Contexto para Claude Code

Sistema de gestión interna para **2C Montajes y Proyectos Eléctricos**. Nació como inventario y se está ampliando a una app de toda la empresa (Bodega, Taller, Oficina Técnica, Prevención, RRHH, Directiva). Lee este archivo al inicio de cada sesión antes de tocar cualquier código.

**Si vas a trabajar en un departamento específico**, lee también su doc en `docs/departamentos/` (ver tabla en la sección "Roles y Departamentos" más abajo) — ahí está el detalle de roles, permisos y pendientes de esa área sin recargar este archivo con las 24 combinaciones de puesto que existen en la empresa.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 App Router (`^14.2.20`) |
| Base de datos | Supabase (PostgreSQL + PostgREST + Auth) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS + clases utilitarias propias en `globals.css` |
| Iconos | `lucide-react ^1.20.0` — **sin sufijo `Icon`** (ej. `Handshake`, no `HandshakeIcon`) |
| Email | `nodemailer` vía SMTP de la empresa (solo para notificar al Administrador de software) |
| Runtime | Node.js / Vercel-ready |

**Variables de entorno necesarias** (detalle y comentarios en `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-only — invitar usuarios desde /admin/solicitudes
SMTP_HOST= / SMTP_PORT= / SMTP_USER= / SMTP_PASS=   # aviso de solicitudes al admin
ADMIN_SOFTWARE_EMAIL=         # a quién le llega el aviso de cada solicitud
NEXT_PUBLIC_SITE_URL=         # para armar links absolutos en los correos
GROQ_API_KEY=                 # opcional — el agente IA funciona sin él
```

---

## Roles y Departamentos

Antes cualquier usuario autenticado tenía acceso total. Desde la migración `supabase/migration_roles_y_perfiles.sql` existe la tabla `perfiles` (departamento + puesto + nivel_acceso por usuario) y `lib/auth/permisos.ts` (tipos, `getPerfil()`, `puedeVer()`/`puedeEditar()`, mapa de módulos por departamento).

**Niveles de acceso** (de menor a mayor): `visualizacion` (solo lectura) → `operador` → `encargado` → `jefe_departamento` → `directiva` (lectura total cross-depto) → `admin_software` / `master` (acceso total + el segundo además gestiona usuarios).

**Docs por departamento** (léelos solo si vas a trabajar ahí):

| Departamento | Doc | Roles |
|---|---|---|
| Bodega | `docs/departamentos/bodega.md` | Ayudante, Chofer-bodeguero, Encargado, Ayudante de encargado |
| Taller | `docs/departamentos/taller.md` | Ayudante de maestro, Maestro tablerista, Encargado, Ayudante de encargado |
| Oficina Técnica | `docs/departamentos/oficina-tecnica.md` | Jefe, Proyectista/ingeniero, Ayudante de jefe, Técnico junior |
| Prevención | `docs/departamentos/prevencion.md` | Prevencionista |
| Recursos Humanos | `docs/departamentos/rrhh.md` | Jefe, Asistente, Practicante |
| Directiva | `docs/departamentos/directiva.md` | Dueño, Jefe directivo, Jefe ejecutivo, Supervisor eléctrico, Ingeniero visitante |
| Administración de software | `docs/departamentos/admin-software.md` | Administrador de software (gestiona usuarios/roles, no es un departamento operativo) |

**Enrolamiento**: `/solicitar-acceso` (público) → genera código y avisa por correo al `ADMIN_SOFTWARE_EMAIL` → el Administrador de software lo aprueba en `/admin/solicitudes` (logueado + código correcto) → se crea el `perfil` y se invita al usuario por correo (Supabase Admin API, `lib/supabase/admin.ts`). Usuarios sin perfil quedan confinados a `/pendiente-aprobacion` por el middleware.

**Módulo de referencia con permisos ya aplicados**: Materiales (`TablaMateriales.tsx` + sus rutas API) — usa el mismo patrón (`requireEditable('materiales')` server-side, prop `editable` en el componente) al extender permisos a otros módulos.

---

## Arquitectura

```
app/                   ← Server Components (fetch datos en servidor)
  [ruta]/page.tsx      ← force-dynamic + getSupabaseServer()
  api/[ruta]/route.ts  ← API Routes (POST/PUT/DELETE desde Client Components)

components/            ← Client Components ('use client')
  [módulo]/Tabla*.tsx  ← listas con CRUD, selección múltiple
  [módulo]/Nueva*.tsx  ← formularios de creación
hooks/
  useSyncedState.ts    ← useState que sincroniza con props del servidor (NO usar en tablas con delete optimista)
types/index.ts         ← todos los tipos TypeScript (Supabase schema)
```

**Patrón de datos:**
- Server Component fetch → pasa `initialData` como prop → Client Component guarda en `useState`
- Mutaciones: `fetch('/api/...')` → actualización optimista local → `router.refresh()` para refrescar Server Component
- **NO** usar `useEffect(() => setItems(initialData), [initialData])` en tablas con delete — causa que los ítems reaparezcan por race condition entre escritura en Supabase y re-lectura del server component

**Números de serie correlativos:**
- Vales de despacho: `VD-YYYY-NNN`
- Entregas de herramientas: `EH-YYYY-NNN`
- Solicitudes de compra: `SC-YYYY-NNN`

---

## Layout

```
Sidebar: w-56 (224px) fijo a la izquierda — solo desktop
Main:    flex-1 md:ml-56
  └─ div: max-w-[1440px] mx-auto flex flex-col flex-1  ← wrapper centrado en layout.tsx
```

- Páginas de **tabla/inventario**: `<div className="p-5 w-full">` — la tabla w-full llena el espacio
- Páginas de **formulario**: `<div className="p-5 w-full max-w-3xl">` — legibilidad de form
- Páginas de **impresión** (`/imprimir`): `max-w-3xl mx-auto` — documento A4
- Agente IA: `flex flex-col flex-1 min-h-0` — no usar `h-screen` (rompe el flex del layout)
- Grilla home: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`

---

## Módulos implementados

### Inventario de Materiales `/materiales`
- CRUD completo con modal
- Filtros: búsqueda, categoría, proveedor, ubicación, stock, precio
- Ordenamiento por columna (click en cabecera)
- Selección múltiple: bulk delete + bulk edit (categoría, proveedor, ubicación, stock mínimo, precio)
- Registro de movimientos inline (entrada/salida/ajuste/devolución) → actualiza `stock_actual` en DB
- Historial de movimientos por material
- Export CSV
- **API**: `/api/materiales`, `/api/materiales/[id]`, `/api/materiales/bulk`

### Inventario de Herramientas `/herramientas`
- CRUD completo con estados: `operativa | en_reparacion | extraviada | dada_de_baja`
- Selección múltiple: bulk delete + bulk edit (estado, responsable, ubicación, frecuencia mantenimiento)
- Indicador de próxima mantención (días restantes, color según urgencia)
- **API**: `/api/herramientas`, `/api/herramientas/[id]`, `/api/herramientas/bulk`

### Trabajadores `/trabajadores`
- CRUD: nombre, RUT, cargo, teléfono
- Soft-delete (`activo: false`)
- Botón directo "Entregar herramientas →"
- **API**: `/api/trabajadores`, `/api/trabajadores/[id]`
- **SQL pendiente** (ejecutar en Supabase):
```sql
CREATE TABLE trabajadores (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  rut         TEXT,
  cargo       TEXT,
  telefono    TEXT,
  activo      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT now()
);
```

### Entrega de Herramientas `/herramientas/entregar`
- Selector de trabajador (fetch fresco en cada montaje desde `/api/trabajadores`)
- Buscador de herramientas operativas con typeahead
- Notas por herramienta
- Al guardar: genera comprobante `EH-YYYY-NNN`, actualiza campo `responsable` en cada herramienta
- Imprime comprobante con 3 firmas
- **API**: `/api/herramientas/entregar`
- **SQL pendiente** (ejecutar en Supabase):
```sql
CREATE TABLE entregas_herramientas (
  id                BIGSERIAL PRIMARY KEY,
  numero            TEXT NOT NULL,
  trabajador_id     BIGINT REFERENCES trabajadores(id),
  trabajador_nombre TEXT NOT NULL,
  usuario           TEXT,
  observaciones     TEXT,
  fecha             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entregas_herramientas_items (
  id             BIGSERIAL PRIMARY KEY,
  entrega_id     BIGINT REFERENCES entregas_herramientas(id) ON DELETE CASCADE,
  herramienta_id BIGINT REFERENCES herramientas(id),
  codigo         TEXT,
  descripcion    TEXT,
  notas          TEXT
);
```

### Entrega de Materiales sin Proyecto `/entregas/nueva`
- Igual que nueva salida pero `proyecto_id: null`
- Usa `/api/salidas` existente — no rompe lógica de stock
- Genera vale de despacho `VD-YYYY-NNN` e imprime comprobante
- Campos: persona que retira, destino/motivo, observaciones

### Despachos (Vales de Despacho) `/salidas`
- Lista de vales con estado y número correlativo `VD-YYYY-NNN`
- Nueva salida vincula a proyecto OT + descuenta stock via `/api/movimientos`
- Comprobante imprimible: **sin precios** (decisión de negocio — guía de despacho interna)
- **API**: `/api/salidas`, `/api/salidas/[id]`

### Proyectos / OT `/proyectos`
- Estados: `presupuesto | en_proceso | terminado | entregado | cancelado`
- Factibilidad por proyecto: lista de materiales requeridos vs stock disponible
- **API**: `/api/proyectos`, `/api/proyectos/[id]`

### Solicitudes de Compra `/solicitudes`
- Correlativo `SC-YYYY-NNN`, estados `pendiente | comprado`
- Comprobante imprimible
- **API**: `/api/solicitudes`, `/api/solicitudes/[id]`

### Movimientos `/movimientos`
- Historial global de entradas/salidas/ajustes/devoluciones
- **API**: `/api/movimientos`

### Agente IA `/agente`
- Detección de intención por regex (sin LLM para la clasificación)
- 9 tipos de intent: stock_bajo, stock_cero, valor_inventario, herramientas_reparacion, herramienta_responsable, buscar_material, buscar_herramienta, historial_movimientos, proyectos_activos
- Queries Supabase read-only según intent
- **Con `GROQ_API_KEY`**: genera respuesta en lenguaje natural vía `llama-3.1-8b-instant` (max_tokens: 300)
- **Sin `GROQ_API_KEY`**: respuesta template + tabla de datos — funciona igual
- Chat con sugerencias predefinidas (10 preguntas con emoji), chips rápidos, tabla inline
- **API**: `/api/agente` (POST `{ pregunta: string }` → `{ respuesta, intent, rows, columnas, titulo }`)

### Etiquetas de Obra `/etiquetas`
- 4 plantillas: Pallet/Obra (full-page), Rack/Estante (95×45mm), Organizador/Cajón (63×38mm), Genérica (mm libres)
- 5 tamaños de hoja: A4 apaisado, A5 apaisado, Carta apaisado (279×216mm), Carta vertical, A4 vertical
- 7 fuentes tipográficas (selector con preview)
- Editor WYSIWYG con drag (pallet) y sliders de tamaño
- Grilla CSS print con `@page { size: letter portrait }` para etiquetas pequeñas
- Preview escalado (620px pallet, 380px small labels)
- Print CSS dinámico según plantilla y hoja

### Dashboard `/dashboard`
- KPIs: valor inventario, alertas stock, herramientas en reparación/extraviadas
- Gráficos (server-rendered)

### Recursos Técnicos `/recursos`
- Calculadoras eléctricas: carga, caída de tensión, corriente, potencia
- Sin base de datos — todo client-side

### Checklist Tablero `/checklist`
- Lista de verificación eléctrica imprimible
- Estado de ítems en sesión (no persiste)

### Importar Materiales `/importar`
- Upload CSV/Excel, análisis con IA (OpenAI opcional), mapeo de columnas, ejecución
- **API**: `/api/importar/analyze`, `/api/importar/classify`, `/api/importar/execute`

### Proveedores `/proveedores`
- CRUD completo
- **API**: `/api/proveedores`, `/api/proveedores/[id]`

---

## Decisiones importantes

| Decisión | Motivo |
|---|---|
| **Sin precios en guía de despacho** | Documento interno de entrega, no factura |
| **Groq opcional** | El agente IA funciona sin API key — no bloquear el deploy |
| **Soft delete** (`activo: false`) | Nunca se borran filas — preservar historial de movimientos |
| **Delete optimista sin re-sync** | `setItems(prev => prev.filter(...))` es suficiente; `router.refresh()` posterior causa race condition y reaparición del ítem |
| **`force-dynamic` en páginas de formulario** | Garantiza datos frescos (proyectos, trabajadores) en cada visita |
| **Fetch en mount para selectores** | `EntregarHerramientas` y `NuevaSalida` hacen fetch propio al montar para no depender de SSR obsoleto |
| **`Array.from(Set)` en lugar de `[...Set]`** | El target TypeScript no soporta spread de Set — usar siempre `Array.from(selectedIds)` |
| **Lucide-react sin sufijo `Icon`** | v1.20.0 exporta `Handshake`, no `HandshakeIcon` |
| **Stock: solo `/api/movimientos`** | Nunca modificar `stock_actual` directamente — siempre vía endpoint de movimientos para mantener historial |

---

## Patrones de código recurrentes

### Server Component con datos
```tsx
export const dynamic = 'force-dynamic'
export default async function Page() {
  const sb = getSupabaseServer()
  const { data } = await sb.from('tabla').select('*').eq('activo', true)
  return <ClientComponent initialData={data ?? []} />
}
```

### Correlativo NNN
```typescript
// Patrón compartido en: /api/salidas, /api/herramientas/entregar, /api/solicitudes
const year = new Date().getFullYear()
const { count } = await sb.from('tabla').select('*', { count: 'exact', head: true })
  .gte('fecha', `${year}-01-01`)
const numero = `PREFIX-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
```

### Bulk API
```typescript
// DELETE soft
await sb.from('tabla').update({ activo: false }).in('id', ids)
// PATCH campos seguros (nunca stock_actual)
await sb.from('tabla').update(safeFields).in('id', ids)
```

### Selector con datos frescos en mount
```typescript
// Siempre usar para selectores cross-page (trabajadores en EntregarHerramientas, etc.)
const [items, setItems] = useState(initialItems)
useEffect(() => {
  fetch('/api/endpoint')
    .then(r => r.json())
    .then(json => { if (Array.isArray(json.data)) setItems(json.data) })
    .catch(() => {})
}, [])
```

---

## Clases CSS propias (globals.css)

```
.panel         → tarjeta blanca con borde y sombra sutil
.panel-search  → igual pero sin overflow-hidden (para dropdowns absolutos)
.panel-header  → barra de encabezado del panel con fondo #FAFBFC
.th / .td / .td-r  → celdas de tabla
.tr-hover      → fila con hover
.btn / .btn-primary / .btn-secondary / .btn-outline / .btn-ghost / .btn-sm / .btn-icon
.label / .input / .select / .textarea
.filters       → barra de filtros sobre tablas
.stat-card / .stat-icon
.alert / .alert-red / .alert-green / .alert-yellow / .alert-blue
.badge / .badge-green / .badge-red / .badge-yellow / .badge-blue / .badge-gray / .badge-brand
.code          → chip de código monoespaciado
.nav-link / .nav-link.active
```

Colores de marca:
- Carbon: `#2E333A` (sidebar, encabezados tabla, textos principales)
- Gold: `#F0C000` (acento, botón primario, nav activo)
- Fondo: `#F5F6F7`

---

## Pendiente / Próximas funciones

- [ ] **SQL Supabase** (ejecutar manualmente): crear tablas `trabajadores`, `entregas_herramientas`, `entregas_herramientas_items` — scripts arriba en la sección de cada módulo
- [ ] **SQL Supabase** (ejecutar manualmente): `supabase/migration_roles_y_perfiles.sql` — roles/perfiles, ver sección "Roles y Departamentos"
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` y `SMTP_*`/`ADMIN_SOFTWARE_EMAIL` en Vercel — sin esto el enrolamiento no invita usuarios ni avisa por correo
- [ ] Aplicar permisos por departamento al resto de los módulos (hoy solo Materiales tiene el patrón completo) — uno por sesión, ver docs/departamentos/
- [ ] Notificaciones push cuando stock cae bajo mínimo
- [ ] Asignación de materiales a proyecto con seguimiento de consumo real vs planificado
- [ ] Histórico de entregas de herramientas por trabajador
- [ ] Multi-empresa / multi-bodega
- [ ] App móvil o PWA para escaneo de códigos de barra

---

## Comandos útiles

```bash
npm run dev      # desarrollo local
npm run build    # verificar compilación (siempre antes de dar por listo)
npm run lint     # linting
```
