# Departamento: Taller

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Ayudante de maestro | `maestro` |
| Maestro 1 *(antes "Maestro tablerista")* | `maestro` — puede crear directamente Test de Alimentadores, Verificación RIC y Prevención de Riesgos (ver `puedeMarcarAvance`/seed de `permisos_puesto` en `migration_piramide_roles.sql`), y marcar etapas de avance de obra como completadas |
| Maestro 2 | `maestro` — mismos permisos que Maestro 1 |
| Maestro Mayor | `modificador` — Supervisor |
| Encargado de taller | `administrador` — Jefe de departamento |
| Ayudante de encargado | `modificador` |

Ver `docs/departamentos/piramide.md` para la pirámide de roles cross-departamento (qué significa cada `nivel_acceso`).

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Herramientas / Entregar herramientas | completo |
| Obras activas (Proyectos) | completo |
| Recursos Técnicos | completo |
| Checklist tablero | completo |
| Etiquetas de obra | completo |
| Agente IA | completo |
| Materiales | lectura |
| Movimientos | lectura |

Ningún módulo de Taller tiene aplicado todavía el patrón `editable`/`requireEditable` (solo Materiales lo tiene, como referencia general).

## Pendiente / reglas específicas

- [ ] Aplicar permisos por nivel a Herramientas y Proyectos (CRUD vs solo lectura).
- [ ] Definir si "Maestro tablerista" puede editar el estado de una herramienta (ej. marcarla en reparación) o solo registrar su uso.
