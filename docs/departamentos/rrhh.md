# Departamento: Recursos Humanos

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Jefe de Recursos Humanos | `jefe_departamento` |
| Asistente de Recursos Humanos | `operador` |
| Practicante | `visualizacion` |

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Trabajadores | completo (según nivel) |

RRHH no tiene acceso a ningún módulo de inventario — es el departamento más aislado del resto de la app hoy.

## Pendiente / reglas específicas

- [ ] Aplicar permisos por nivel a Trabajadores (hoy cualquier `nivel_acceso` con acceso al módulo puede editar/eliminar, sin distinguir Practicante de Jefe).
- [ ] Evaluar si RRHH necesita un módulo propio (licencias, asistencia) más allá de la ficha de Trabajadores que hoy es solo para asignar herramientas.
