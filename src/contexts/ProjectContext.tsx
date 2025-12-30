import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserProjects } from '@/hooks/useUserProjects';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface ProjectWithRole extends Project {
  roles: AppRole[];
}

interface ProjectContextType {
  projects: ProjectWithRole[];
  currentProject: ProjectWithRole | null;
  currentProjectId: string | null;
  userRoles: AppRole[];
  projectRoles: AppRole[]; // All roles assigned to the project
  setCurrentProjectId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createProject: (name: string, description?: string) => Promise<Project>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projects, loading, error, refetch, createProject } = useUserProjects();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectRoles, setProjectRoles] = useState<AppRole[]>([]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const userRoles = currentProject?.roles || [];

  // Auto-select first project if none selected
  useEffect(() => {
    if (!currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
    }
  }, [projects, currentProjectId]);

  // Fetch all roles assigned to the current project (for dynamic approval cascade)
  useEffect(() => {
    if (!currentProjectId) {
      setProjectRoles([]);
      return;
    }

    const fetchProjectRoles = async () => {
      const { data, error } = await supabase.rpc('get_project_roles', {
        _project_id: currentProjectId
      });

      if (!error && data) {
        setProjectRoles(data as AppRole[]);
      }
    };

    fetchProjectRoles();
  }, [currentProjectId]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        currentProjectId,
        userRoles,
        projectRoles,
        setCurrentProjectId,
        loading,
        error,
        refetch,
        createProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
