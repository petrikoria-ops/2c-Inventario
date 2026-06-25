# Departamento: Oficina Técnica

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Jefe de oficina técnica | `jefe_departamento` |
| Proyectista / ingeniero | `operador` |
| Ayudante de jefe de oficina técnica | `operador` |
| Técnico junior / ingeniero junior | `visualizacion` |

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Compras (Solicitudes) | completo |
| Obras activas (Proyectos) | completo |
| Recursos Técnicos | completo |
| Agente IA | completo |
| Materiales | lectura (para factibilidad) |
| Proveedores | lectura |
| Métricas | solo `jefe_departamento` |

## Pendiente / reglas específicas

- [ ] Aplicar permisos por nivel a Proyectos y Solicitudes de compra.
- [ ] Confirmar si "Técnico junior" debería poder crear factibilidades de proyecto o solo verlas.
