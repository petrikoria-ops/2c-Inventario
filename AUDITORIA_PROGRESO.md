# Auditoría 2C Inventario — Progreso de aplicación

Seguimiento de la implementación de los hallazgos de la auditoría de código
del 12/08/2026 (informe completo: `auditoria-2c-inventario.html`, publicado
como Artifact). Este archivo es la fuente de verdad del avance — no depende
de ningún chat específico. Actualizar la casilla y la fecha al cerrar cada
ítem.

Leyenda: `[ ]` pendiente · `[x]` aplicado · `[~]` aplicado parcialmente (ver nota)

---

## 7 días — bloqueante (seguridad)

- [x] **AUD-005** — Corregido: `requireEditable()` ahora falla cerrado (`!perfil || !puedeEditar(...)`) en vez de dejar pasar sin perfil.
- [x] **AUD-001** — Trabajadores: página gatea con `puedeVer`/`puedeEditar`, botones condicionados con `editable`, y los 3 endpoints (`POST`, `PUT`, `DELETE`) exigen `requireEditable('trabajadores')`.
- [x] **AUD-010** — GET de Trabajadores oculta `rut` a quien no tiene acceso al módulo (se mantiene abierto a autenticados porque Entrega de herramientas/Trabajadores de obra lo necesitan por nombre); `export/materiales` y `export/movimientos` ahora exigen `puedeVer()`.
- [x] **AUD-002** — Los 5 endpoints de Proyectos (`POST/PUT/DELETE` proyecto, `POST` materiales, `PUT/DELETE` ítem, `POST` solicitud) exigen `requireEditable('proyectos'|'compras')`; UI de la lista de proyectos condicionada con `editable`.
- [x] **AUD-013** — Factibilidad: página gatea con `puedeVer('proyectos')`, componente recibe `editable`/`editableCompras` y oculta buscador, alta manual, importar Excel, edición de cantidades, quitar ítem y generar solicitud según corresponda.
- [x] **AUD-003** — `analyze`, `execute` y `classify` (POST) exigen `requireEditable(type)`; página `/importar` redirige si no puede editar materiales ni herramientas; `materiales/upsert` (sin ningún consumidor activo, pero expuesto) también protegido.
- [x] **AUD-004** — Al desactivar/reactivar un usuario, además de `perfiles.activo`, se banea/desbanea la cuenta vía `supabase.auth.admin.updateUserById` (`ban_duration`); `getPerfil()` filtra `activo=true`.
- [x] **AUD-006** — Nadie puede cambiar su propio `nivel_acceso` ni su propio `activo`; solo un usuario `master` puede otorgar `master` (tanto al editar un usuario como al aprobar una solicitud de acceso); el selector de nivel oculta la opción "Master" si quien edita no es master.

### Bonus aplicado junto con AUD-003 (no era parte del plan de 7 días)
- [x] **AUD-018 (parcial)** — El `GET` de diagnóstico de `/api/importar/classify` (antes público, exponía si `GROQ_API_KEY` está configurada y gastaba cupo real de Groq en cada llamada) ahora exige `admin_software`/`master`.

## 30 días — alto impacto

- [ ] **AUD-007** — Decidir y ejecutar estrategia de RLS (reforzar por rol o compensar con más pruebas de API)
- [ ] **AUD-008** — Sanear mensajes de error crudos expuestos al cliente (69 ocurrencias, 40 archivos)
- [ ] **AUD-009** — Verificación de `Origin`/CSRF básico + evaluar rate-limiting
- [ ] **AUD-017** — Agregar Content-Security-Policy (y evaluar HSTS)
- [ ] **AUD-011** — Permisos por departamento en el Agente IA
- [ ] **AUD-031** — Delimitar datos vs. instrucciones en el prompt del Agente IA
- [ ] **AUD-012** — Trazabilidad real de "usuario" derivada de sesión (movimientos, reversiones de salidas)
- [ ] **AUD-014** — Columnas de auditoría (`comprado_por`/`comprado_en`) en Solicitudes de Compra
- [ ] **AUD-025** — Registro de uso de "Ver como" (auditoría de simulación de departamento)
- [x] **AUD-016** — Corregido: las 3 consultas de conteo de herramientas del dashboard ahora filtran `.eq('activo', true)`.
- [ ] **AUD-021** — Atomizar actualización de stock (evitar condición de carrera)
- [ ] **AUD-022** — Agregar CHECK faltantes en esquema (stock/precio ≥ 0, cantidad > 0)
- [ ] **AUD-015** — Generalizar `ConfirmDangerModal` a borrados individuales

## 90 días — consolidación

- [ ] **AUD-030** — Persistir Checklist de tablero (hoy vive solo en estado de React)
- [~] **AUD-018** — `importar/classify` GET ya exige admin (ver 7 días); falta revisar/retirar `test-email`
- [ ] **AUD-019** — Confirmar política de contraseña server-side en Supabase Auth
- [ ] **AUD-020** — Rate-limit y validación de payload en `/api/log-error`
- [ ] **AUD-027** — `UNIQUE(rut)` en proveedores y trabajadores
- [ ] **AUD-028** — Reintento ante colisión de folio en Solicitudes de Compra
- [ ] **AUD-029** — Validar cierre de Verificación RIC (no completar sin firma/ítems resueltos)
- [ ] **AUD-032** — Soporte táctil + scroll en vista previa de Etiquetas de obra
- [ ] **AUD-033** — Gating de permisos + tipo propio para Entrega por mano
- [ ] **AUD-038** — Bitácora de cambios de estado de Herramientas
- [ ] **AUD-023** — Comunicar ventana de 30 días/100 registros en listas de Movimientos/Salidas
- [ ] **AUD-024** — Exigir motivo cuando `tipo === 'ajuste'`
- [ ] **AUD-026** — Confirmación específica al eliminar OT (listar efecto cascada)
- [ ] **AUD-034 a AUD-040** — Barrido de accesibilidad y consistencia de nomenclatura

## Fuera de alcance de la auditoría (decisión ya tomada, no requiere acción)

- **AUD-Prevención (catálogo demo)** — 4 filas de `catalogo_hallazgos` marcadas `origen: 'demo-inspeccion'` son semilla intencional, no se eliminan.

---

## Bitácora

| Fecha | Ítems cerrados | Notas |
|---|---|---|
| 2026-08-12 | — | Auditoría publicada, arranca aplicación de hallazgos del plan 7 días |
| 2026-08-12 | AUD-001, 002, 003, 004, 005, 006, 010, 013, 016, 018 (parcial) | Los 8 críticos del plan de 7 días quedaron cerrados en una sola sesión (todos los `requireEditable`/`puedeVer` que faltaban, revocación real al desactivar, bloqueo de auto-escalado a master) más 2 items del 30/90 días que caían en los mismos archivos. `tsc --noEmit` y `next build` sin errores. Pendiente: correr la migración SQL en Supabase si aún no está aplicada, probar el flujo en `npm run dev` con distintos roles, y `git push`. |
