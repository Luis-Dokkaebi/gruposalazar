import { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

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
