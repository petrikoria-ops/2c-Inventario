# Departamento: Oficina Técnica

Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Roles

| Puesto | nivel_acceso |
|---|---|
| Jefe de oficina técnica | `administrador` — Jefe de departamento |
| Proyectista / ingeniero | `modificador` |
| Ayudante de jefe de oficina técnica | `modificador` |
| Técnico junior / ingeniero junior | `maestro` |

Ver `docs/departamentos/piramide.md` para la pirámide de roles cross-departamento (qué significa cada `nivel_acceso`).

## Módulos visibles

| Módulo | Acceso |
|---|---|
| Compras (Solicitudes) | completo |
| Obras activas (Proyectos) | completo |
| Recursos Técnicos | completo |
| Agente IA | completo |
| Materiales | lectura (para factibilidad) |
| Proveedores | lectura |
| Métricas | solo `administrador` (Jefe de oficina técnica) |

## Pendiente / reglas específicas

- [ ] Aplicar permisos por nivel a Proyectos y Solicitudes de compra.
- [ ] Confirmar si "Técnico junior" debería poder crear factibilidades de proyecto o solo verlas.
