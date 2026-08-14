# Departamento: Prevención

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Prevencionista | `administrador` — es el único puesto de Prevención, así que hace de Jefe de departamento |

Ver `docs/departamentos/piramide.md` para la pirámide de roles cross-departamento (qué significa cada `nivel_acceso`).

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Checklist tablero | completo |
| Recursos Técnicos | completo |
| Herramientas | lectura (estado/mantención, no responsable ni edición) |

Es el departamento con el alcance más acotado a propósito — no tiene acceso a Materiales, Trabajadores, Proyectos ni Compras salvo que el dueño del negocio confirme que lo necesita.

## Pendiente / reglas específicas

- [ ] Confirmar si Prevención necesita ver el módulo de Proyectos (para verificación de tableros por obra) — hoy no lo tiene.
- [ ] Aplicar permisos por nivel a Checklist tablero (hoy no persiste en base, ver `app/checklist/page.tsx`).
