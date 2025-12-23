# Auditoría de Seguridad: Gestión de Roles y Colaboradores

## 1. Análisis de Vulnerabilidad Frontend
**Pregunta:** ¿Puede un usuario asignarse un rol que no le corresponde manipulando el estado local?

**Hallazgo:**
La política RLS (Row Level Security) actual en `supabase/migrations/20251219060000_role_management_policy.sql` es:
```sql
USING (EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.user_id = auth.uid() AND pm.role = 'soporte_tecnico'))
```
Esta política es **segura** contra la escalada de privilegios básica mediante manipulación del frontend. Aunque un atacante modifique su variable JavaScript `currentUser.role` a 'soporte_tecnico', la base de datos verifica el `auth.uid()` (obtenido del token JWT firmado) directamente contra la tabla `project_members`. Si el usuario no tiene el registro en la base de datos, la operación de actualización/eliminación fallará silenciosamente (o con error), previniendo el cambio no autorizado.

**Deficiencia Detectada:**
Aunque el RLS previene la escritura no autorizada, el frontend (`useCollaborators.ts`) carecía de validación previa. Esto permitía que usuarios no autorizados *intentaran* la acción, recibiendo un error genérico o ningún feedback, lo cual es una mala experiencia de usuario y expone la superficie de ataque. Además, la política SQL actual no implementa la restricción de negocio de que "Soporte Técnico no puede modificar a otros usuarios de Soporte Técnico".

## 2. Refactorización del Hook (`useCollaborators.ts`)
Se ha implementado una capa de seguridad explícita en el cliente:
- Se añadió la función `checkSupportPermission()` que verifica contra la base de datos si el usuario actual tiene el rol `soporte_tecnico` antes de proceder.
- Esta verificación se ejecuta al inicio de todas las funciones de mutación (`addCollaborator`, `updateCollaborator`, `deleteCollaborator`, `toggleStatus`).
- Se utiliza una constante `SUPPORT_ROLE` sincronizada con los tipos para evitar errores de "magic strings".

## 3. Sincronización de Tipos (`collaborator.ts`)
- Se han definido explícitamente los roles en `APP_ROLES` como un array tipado con `AppRole[]`.
- Esto asegura que los valores en tiempo de ejecución estén estrictamente sincronizados con la definición de tipos de la base de datos (`Database['public']['Enums']['app_role']`).
- Si el enum de la base de datos cambia, TypeScript emitirá un error de compilación si el array de constantes no se actualiza, garantizando la consistencia.
