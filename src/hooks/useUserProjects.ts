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
      // First check if user has 'soporte_tecnico' role in any project OR is the global admin.
      // We use .limit(1) to avoid error if user has multiple support roles (e.g. in different projects)
      const { data: supportRoles } = await supabase
        .from('project_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'soporte_tecnico')
        .limit(1);

      // Check specific email for admin access or DB role
      const isSupport = (user.email === 'armandoag_1996@hotmail.com') || (supportRoles && supportRoles.length > 0);

      let projectList: ProjectWithRole[] = [];

      if (isSupport) {
        // Support sees ALL projects
        const { data: allProjects, error: allProjectsError } = await supabase
          .from('projects')
          .select('*');

        if (allProjectsError) throw allProjectsError;

        // Map to ProjectWithRole, assigning 'soporte_tecnico' as their role for all of them
        // or fetching their actual roles + implied support access.
        // For simplicity and to satisfy the requirement "access to read all",
        // we'll fetch actual memberships but also include non-member projects with a virtual role if needed,
        // or just rely on the fact that if they are support, they can access everything.
        // The ProjectContext uses `roles` to determine permissions.
        
        // Let's get actual memberships to be accurate about other roles
        const { data: memberships, error: memberError } = await supabase
          .from('project_members')
          .select(`
            project_id,
            role
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const membershipMap = new Map<string, AppRole[]>();
        memberships?.forEach((m: any) => {
             if (!membershipMap.has(m.project_id)) {
                 membershipMap.set(m.project_id, []);
             }
             membershipMap.get(m.project_id)!.push(m.role);
        });

        projectList = (allProjects || []).map((p: any) => {
            const projectRoles = membershipMap.get(p.id) || [];
            // Ensure support role is present if user is support/admin
            if (!projectRoles.includes('soporte_tecnico')) {
                projectRoles.push('soporte_tecnico');
            }
            return {
                ...p,
                roles: projectRoles
            };
        });

      } else {
        // Normal flow: Get all projects where user is a member
        const { data: memberships, error: memberError } = await supabase
          .from('project_members')
          .select(`
            project_id,
            role,
            projects (*)
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;

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
        projectList = Array.from(projectMap.values());
      }

      setProjects(projectList);
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
