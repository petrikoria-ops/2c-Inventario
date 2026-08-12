# Departamento: Directiva

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Dueño | `master` (acceso total) |
| Jefe directivo | `master` (acceso total) |
| Jefe ejecutivo | `directiva` (lectura total, sin edición operativa) |
| Supervisor eléctrico | `jefe_departamento` (cross-depto: Bodega + Taller + Oficina Técnica) — **Supervisor de obra** |
| Ingeniero visitante | `visualizacion` (acceso temporal) — **Visitador de obra** |

## Módulos visibles

`master` ve y edita todo, en todos los departamentos — no hay restricción de módulo para ese nivel (ver `lib/auth/permisos.ts`, `NIVELES_TOTALES`).

Para `directiva` (lectura total, salvo lo que se detalla abajo):

| Módulo | Acceso |
|---|---|
| Materiales, Herramientas, Movimientos, Proveedores, Compras, Trabajadores, Proyectos | lectura |
| Métricas | completo |
| Agente IA | completo |
| Avance de obra, Verificación RIC | completo |

`Supervisor eléctrico` todavía usa el mapa genérico de `directiva` para el resto de módulos — falta implementar el acceso cross-departamento real (Bodega + Taller + Oficina Técnica con nivel `jefe_departamento`), ya que el modelo actual asume un usuario = un departamento. Esto **no** bloquea su uso de Avance de obra / Verificación RIC, que ya funcionan con el mapa de `directiva` tal cual.

### Visitador de obra ("Ingeniero visitante") — excepción de edición

El puesto "Ingeniero visitante" tiene `nivel_acceso: 'visualizacion'`, que por regla general del sistema **nunca** edita nada (ver `puedeEditar()` en `lib/auth/permisos.ts`). Para que el Visitador de obra pueda generar solicitudes de compra y crear/editar el avance y la verificación RIC de sus obras, se agregó una excepción puntual centralizada en `EXCEPCIONES_EDICION_POR_PUESTO` (mismo archivo) — el único lugar del sistema que mira `perfil.puesto` en vez de `departamento`/`nivel_acceso`:

```ts
const EXCEPCIONES_EDICION_POR_PUESTO: Partial<Record<string, Modulo[]>> = {
  'Ingeniero visitante': ['compras', 'avance_obra', 'verificacion_ric'],
}
```

El resto de sus permisos (materiales, herramientas, proyectos, trabajadores) sigue siendo de solo lectura, como corresponde a "acceso temporal".

### Avance de obra — quién estructura vs. quién marca

Ambos puestos (`avance_obra: 'completo'` para todo `directiva`) pueden técnicamente crear/editar/borrar etapas a nivel de API — la separación real ("el Visitador crea el plan, el Supervisor solo marca") es de interfaz, no de permisos duros: helpers `esVisitadorDeObra(perfil)` / `esSupervisorDeObra(perfil)` en `lib/auth/permisos.ts` (comparan `perfil.puesto`) condicionan qué controles muestra `components/proyectos/AvanceObra.tsx`. Si en algún momento se necesita que la API también lo bloquee a nivel de servidor (no solo la UI), la extensión natural es una tabla de excepciones por *acción* (`'avance_obra:estructura'` vs `'avance_obra:marcar'`), replicando el mismo patrón — no antes de que haga falta de verdad.

## Módulos nuevos: Avance de obra y Verificación RIC N°18/19

- **Avance de obra** (`/avance-obra`, `/proyectos/[id]/avance`): plan de etapas por obra con barra de progreso tipo línea de tiempo. Lo crea el Visitador, lo marca el Supervisor. Tablas: `avances_obra` (1:1 con `proyectos`), `avances_obra_items`.
- **Verificación RIC N°18/19** (`/verificacion-ric`): ficha técnica de terreno para verificación inicial y puesta en marcha — **v1 solo Sección A** (12 bloques A.0–A.11 + cierre/firma; el Anexo SAT por tablero, la librería de tipos de tablero y las 5 tablas de mediciones detalladas del documento original quedan para una siguiente entrega). Contenido real transcrito en `lib/verificacionRic/plantilla.ts`. Tablas: `verificaciones_ric` (correlativo `RIC-YYYY-NNN`), `verificaciones_ric_items`. Incluye evidencia fotográfica real (Supabase Storage, bucket privado `verificaciones-ric`).
- **Trabajadores por obra** (dentro de `/proyectos/[id]`): tabla puente `proyectos_trabajadores`, gateada con el permiso de `proyectos` (no un módulo nuevo) — Visitador/Supervisor solo ven, Taller/Oficina Técnica gestionan.
- Migración: `supabase/migration_avance_obra_y_verificacion_ric.sql` (pendiente de ejecutar manualmente, ver `CLAUDE.md`).

## Pendiente / reglas específicas

- [ ] Implementar acceso multi-departamento para "Supervisor eléctrico" (hoy el modelo de `perfiles` solo permite un departamento por usuario) — no bloquea Avance de obra ni Verificación RIC.
- [ ] Confirmar si "Ingeniero visitante" necesita expiración automática de su cuenta (acceso temporal real, no solo nominal).
- [ ] Verificación RIC: agregar el Anexo SAT por tablero (repetible), la librería de tipos de tablero, y las 5 tablas de mediciones (alimentadores, bucle/diferencial, iluminación, puesta a tierra, otras verificaciones) — quedaron fuera de la v1 a propósito.
- [ ] Verificación RIC: sin compresión de imagen antes de subir — fotos de celular pueden pesar varios MB en conexiones de obra lentas.
