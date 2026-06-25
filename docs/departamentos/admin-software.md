# Administrador de software

No es un departamento operativo de la empresa — es el rol técnico que administra el sistema. Lee también el `CLAUDE.md` raíz antes de trabajar aquí.

## Rol

| Puesto | nivel_acceso |
|---|---|
| Administrador de software | `admin_software` (acceso total a los datos + gestión de usuarios) |

## Responsabilidades / módulos

- **Gestión de usuarios** (`/admin/solicitudes`, `components/admin/PanelSolicitudes.tsx`): revisa solicitudes de `/solicitar-acceso`, verifica el código enviado por correo, asigna departamento/puesto/nivel_acceso y aprueba (invita por correo) o rechaza.
- Acceso total a todos los módulos de negocio, igual que `master` (confirmado con el dueño del negocio — ver decisión en el plan de implementación de roles).

## Flujo de enrolamiento (referencia rápida)

1. `/solicitar-acceso` (público) → crea fila en `solicitudes_enrolamiento` con un código de 6 dígitos → `lib/email/sendMail.ts` avisa a `ADMIN_SOFTWARE_EMAIL`.
2. Administrador de software entra a `/admin/solicitudes` (requiere sesión con `nivel_acceso` admin_software/master) e ingresa el código.
3. Al aprobar: `app/api/admin/solicitudes/[id]/aprobar/route.ts` usa `lib/supabase/admin.ts` (service_role) para invitar al usuario por correo y crea su fila en `perfiles`.

## Pendiente / reglas específicas

- [ ] Probar el envío real de correos — bloqueado hasta que se configuren `SMTP_HOST/PORT/USER/PASS` en Vercel.
- [ ] Decidir si puede haber más de un Administrador de software, y si necesita un registro de auditoría de qué aprobó/rechazó (hoy solo queda `resuelto_por` en `solicitudes_enrolamiento`).
