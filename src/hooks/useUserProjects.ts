import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectMember = Database['public']['Tables']['project_members']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface ProjectWithRole extends Project {
  roles: AppRole[];
}

export function useUserProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Get all projects where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          projects (*)
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Group by project and collect roles
      const projectMap = new Map<string, ProjectWithRole>();
      
      memberships?.forEach((membership: any) => {
        const projectId = membership.project_id;
        const project = membership.projects;
        
        if (!project) return;
        
        if (projectMap.has(projectId)) {
          projectMap.get(projectId)!.roles.push(membership.role);
        } else {
          projectMap.set(projectId, {
            ...project,
            roles: [membership.role]
          });
        }
      });

      setProjects(Array.from(projectMap.values()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string) => {
    if (!user) throw new Error('No authenticated user');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        created_by: user.id
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Add creator as admin/all roles
    await supabase.from('project_members').insert([
      { project_id: project.id, user_id: user.id, role: 'contratista' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'residente' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'superintendente' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'lider_proyecto' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'compras' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'finanzas' as AppRole },
      { project_id: project.id, user_id: user.id, role: 'pagos' as AppRole },
    ]);

    await fetchProjects();
    return project;
  };

  return {
    projects,
    loading,
    error,
    createProject,
    refetch: fetchProjects
  };
}
