# Departamento: Taller

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Ayudante de maestro | `visualizacion` |
| Maestro tablerista | `operador` |
| Encargado de taller | `encargado` |
| Ayudante de encargado | `operador` |

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
