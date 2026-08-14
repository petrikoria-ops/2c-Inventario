# Departamento: Directiva

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Gerente *(antes "Dueño")* | `master` (acceso total) — Gerencia |
| Jefe directivo | `master` (acceso total) — Gerencia |
| Jefe ejecutivo | `administrador` |
| Supervisor eléctrico | `modificador` — **Supervisor de obra** |
| Visitador de obra *(antes "Ingeniero visitante")* | `administrador` — **Visitador de obra** |

Ver `docs/departamentos/piramide.md` para la pirámide de roles cross-departamento completa (qué significa cada `nivel_acceso`, y por qué `administrador`/`modificador`/`maestro` no son bypass de código).

## Módulos visibles

`master` ve y edita todo, en todos los departamentos — no hay restricción de módulo para ese nivel (ver `lib/auth/permisos.ts`, `NIVELES_TOTALES`).

`administrador`/`modificador` no bypasean nada — su acceso real sigue viniendo 100% de `permisos_puesto` / `permisos_usuario_overrides` (editable desde `/admin/permisos`), igual que cualquier otro puesto de la empresa.

### Visitador de obra — cómo llegó a `administrador`

El puesto se llamaba "Ingeniero visitante" y tenía `nivel_acceso: 'visualizacion'` (el más restringido del sistema), con una excepción puntual hardcodeada (`EXCEPCIONES_EDICION_POR_PUESTO`, ya no existe en código) para poder generar solicitudes de compra y crear/editar avance de obra y verificación RIC. Esa excepción quedó reemplazada por la pirámide de roles: el Visitador de obra ahora es tier `administrador` de pleno derecho, con sus permisos reales definidos como cualquier otro puesto en `permisos_puesto` (ver seed en `migration_permisos_granulares.sql` + el remapeo de `migration_piramide_roles.sql`).

### Avance de obra — quién estructura vs. quién marca

La separación ("el Visitador/administrador estructura el plan, el Supervisor y el Maestro de terreno solo marcan etapas como completadas") sí está reforzada a nivel de servidor, no solo de interfaz:

- **Estructurar** (crear el plan, agregar/editar/borrar etapas): exige `puedeModificar(perfil, 'avance_obra')` — quien tenga ese permiso real en `permisos_puesto` (típicamente el Visitador de obra o un `administrador`/`master`).
- **Marcar una etapa como completada**: exige `puedeMarcarAvance(perfil)` (`lib/auth/permisos.ts`) — es `true` si ya puede modificar `avance_obra`, **o** si el puesto es `'Maestro 1' | 'Maestro 2' | 'Maestro Mayor'` (los puestos de terreno de Taller). Así un Maestro puede tildar su propio avance sin poder tocar el texto de una etapa ni borrarla.

`app/api/avance-obra/items/[itemId]/route.ts` decide cuál de las dos exigir mirando qué campos trae el body del PATCH (solo `completado` → marcar; cualquier otro campo → estructurar). Los helpers de UI `esVisitadorDeObra(perfil)` / `esSupervisorDeObra(perfil)` / `puedeEstructurarAvance(perfil)` siguen condicionando qué controles muestra `components/proyectos/AvanceObra.tsx`, ahora en sintonía con el candado real de la API.

## Módulos nuevos: Avance de obra y Verificación RIC N°18/19

- **Avance de obra** (`/avance-obra`, `/proyectos/[id]/avance`): plan de etapas por obra con barra de progreso tipo línea de tiempo. Lo crea el Visitador, lo marca el Supervisor. Tablas: `avances_obra` (1:1 con `proyectos`), `avances_obra_items`.
- **Verificación RIC N°18/19** (`/verificacion-ric`): ficha técnica de terreno para verificación inicial y puesta en marcha — **v1 solo Sección A** (12 bloques A.0–A.11 + cierre/firma; el Anexo SAT por tablero, la librería de tipos de tablero y las 5 tablas de mediciones detalladas del documento original quedan para una siguiente entrega). Contenido real transcrito en `lib/verificacionRic/plantilla.ts`. Tablas: `verificaciones_ric` (correlativo `RIC-YYYY-NNN`), `verificaciones_ric_items`. Incluye evidencia fotográfica real (Supabase Storage, bucket privado `verificaciones-ric`).
- **Trabajadores por obra** (dentro de `/proyectos/[id]`): tabla puente `proyectos_trabajadores`, gateada con el permiso de `proyectos` (no un módulo nuevo) — Visitador/Supervisor solo ven, Taller/Oficina Técnica gestionan.
- Migración: `supabase/migration_avance_obra_y_verificacion_ric.sql` (pendiente de ejecutar manualmente, ver `CLAUDE.md`).

## Pendiente / reglas específicas

- [ ] El modelo de `perfiles` sigue permitiendo solo un departamento por usuario — la pirámide de roles (`docs/departamentos/piramide.md`) resuelve la jerarquía cross-departamento vía `nivel_acceso`, pero no un acceso multi-departamento real (ej. alguien con permisos simultáneos en Bodega y Taller). No bloquea nada hoy.
- [ ] "Visitador de obra" ya no es "acceso temporal" nominal (subió de `visualizacion` a `administrador`) — confirmar si sigue teniendo sentido alguna forma de expiración de cuenta para ese puesto.
- [ ] Verificación RIC: agregar el Anexo SAT por tablero (repetible), la librería de tipos de tablero, y las 5 tablas de mediciones (alimentadores, bucle/diferencial, iluminación, puesta a tierra, otras verificaciones) — quedaron fuera de la v1 a propósito.
- [ ] Verificación RIC: sin compresión de imagen antes de subir — fotos de celular pueden pesar varios MB en conexiones de obra lentas.
