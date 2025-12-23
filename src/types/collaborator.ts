import { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

// Explicitly define roles to ensure runtime availability and type safety.
// This array is typed as AppRole[], so if the DB enum changes, this will error at compile time,
// ensuring strict synchronization.
export const APP_ROLES: AppRole[] = [
  "contratista",
  "residente",
  "superintendente",
  "lider_proyecto",
  "compras",
  "finanzas",
  "pagos",
  "soporte_tecnico",
];

export const SUPPORT_ROLE: AppRole = 'soporte_tecnico';

export interface ProjectInfo {
  id: string;
  name: string;
}

export interface ManualCollaborator {
  id: string;
  fullName: string;
  email: string;
  role: AppRole; // We assume one role for the manual entry as per form requirement
  projects: ProjectInfo[];
  isActive: boolean;
  type: 'manual';
  createdAt: string;
}

export interface SystemCollaborator {
  id: string; // profile id
  fullName: string | null;
  email: string;
  roles: AppRole[]; // System users might have different roles in different projects
  projects: ProjectInfo[];
  isActive: boolean;
  type: 'system';
}

export type Collaborator = ManualCollaborator | SystemCollaborator;
