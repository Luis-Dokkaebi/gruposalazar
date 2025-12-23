import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Collaborator, ManualCollaborator, SystemCollaborator, ProjectInfo, AppRole, SUPPORT_ROLE } from '@/types/collaborator';
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = 'manual_collaborators_data';

export function useCollaborators() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableProjects, setAvailableProjects] = useState<ProjectInfo[]>([]);
  const { toast } = useToast();

  // Local state for manual collaborators (Simulating DB with localStorage persistence)
  const [manualCollaborators, setManualCollaborators] = useState<ManualCollaborator[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load manual collaborators", e);
      return [];
    }
  });

  // Save to localStorage whenever manual list changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualCollaborators));
  }, [manualCollaborators]);

  const checkSupportPermission = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuario no autenticado.");
      }

      // Check if user has 'soporte_tecnico' role in any project
      const { data, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', SUPPORT_ROLE)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error verifying permissions:", error);
        throw new Error("Error verificando permisos.");
      }

      if (!data) {
        throw new Error("Acceso denegado: Se requiere el rol de Soporte Técnico.");
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Permisos insuficientes",
        description: error.message || "No tienes autorización para realizar esta acción.",
        variant: "destructive"
      });
      return false;
    }
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    setAvailableProjects(data || []);
  };

  const fetchSystemCollaborators = async () => {
    // Fetch all members to group them
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        id,
        role,
        project_id,
        projects (name),
        profiles (id, email, full_name)
      `);

    if (error) {
      toast({
        title: "Error fetching system users",
        description: error.message,
        variant: "destructive"
      });
      return [];
    }

    // Group by user (profile id)
    const groupedMap = new Map<string, SystemCollaborator>();

    data?.forEach((item: any) => {
      if (!item.profiles) return;

      const userId = item.profiles.id;
      const projectInfo: ProjectInfo = {
        id: item.project_id,
        name: item.projects?.name || 'Unknown Project'
      };

      if (groupedMap.has(userId)) {
        const existing = groupedMap.get(userId)!;
        // Avoid duplicate projects if any
        if (!existing.projects.some(p => p.id === projectInfo.id)) {
          existing.projects.push(projectInfo);
        }
        if (!existing.roles.includes(item.role)) {
          existing.roles.push(item.role);
        }
      } else {
        groupedMap.set(userId, {
          id: userId,
          fullName: item.profiles.full_name,
          email: item.profiles.email,
          roles: [item.role],
          projects: [projectInfo],
          isActive: true, // System users are active by default in this view
          type: 'system'
        });
      }
    });

    return Array.from(groupedMap.values());
  };

  const refresh = async () => {
    setLoading(true);
    await fetchProjects();
    const systemUsers = await fetchSystemCollaborators();
    // Combine system users with manual collaborators
    setCollaborators([...manualCollaborators, ...systemUsers]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []); // Initial load

  // Re-merge when manual list changes
  useEffect(() => {
    const mergeData = async () => {
       const systemUsers = await fetchSystemCollaborators();
       setCollaborators([...manualCollaborators, ...systemUsers]);
    };
    mergeData();
  }, [manualCollaborators]);

  const sendInvitationEmail = async (
    email: string, 
    inviteUrl: string, 
    projectName: string, 
    role: AppRole,
    inviterName?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email,
          inviteUrl,
          projectName,
          role,
          inviterName
        }
      });

      if (error) {
        console.error('Error sending invitation email:', error);
        return false;
      }

      console.log('Invitation email sent successfully:', data);
      return data?.success ?? false;
    } catch (error) {
      console.error('Error invoking send-invitation-email function:', error);
      return false;
    }
  };

  const addCollaborator = async (data: Omit<ManualCollaborator, 'id' | 'createdAt' | 'isActive' | 'type'>) => {
    if (!(await checkSupportPermission())) return;

    // Get current user info for inviter name
    const { data: { user } } = await supabase.auth.getUser();
    let inviterName: string | undefined;
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      inviterName = profile?.full_name || user.email;
    }

    const newCollaborator: ManualCollaborator = {
      ...data,
      id: crypto.randomUUID(),
      isActive: true,
      type: 'manual',
      createdAt: new Date().toISOString()
    };

    // Send invitation email for each project
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const project of data.projects) {
      try {
        // Create invitation in DB and get invite URL
        const { data: invitationId, error: inviteError } = await supabase.rpc('create_project_invitation', {
          _project_id: project.id,
          _role: data.role,
          _email: data.email,
          _expires_in_days: 7
        });

        if (inviteError) {
          console.error('Error creating invitation:', inviteError);
          emailsFailed++;
          continue;
        }

        // Get the invitation token
        const { data: invitation, error: fetchError } = await supabase
          .from('project_invitations')
          .select('token')
          .eq('id', invitationId)
          .single();

        if (fetchError || !invitation) {
          console.error('Error fetching invitation token:', fetchError);
          emailsFailed++;
          continue;
        }

        const inviteUrl = `${window.location.origin}/invite?token=${invitation.token}`;

        // Send the email
        const success = await sendInvitationEmail(
          data.email,
          inviteUrl,
          project.name,
          data.role,
          inviterName
        );

        if (success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
      } catch (error) {
        console.error('Error processing invitation for project:', project.name, error);
        emailsFailed++;
      }
    }

    setManualCollaborators(prev => [...prev, newCollaborator]);

    const projectList = data.projects.map(p => p.name).join(", ");
    
    if (emailsSent > 0 && emailsFailed === 0) {
      toast({
        title: "Invitación enviada",
        description: `Correo de invitación enviado a ${data.email} para: ${projectList}`,
        duration: 5000,
      });
    } else if (emailsSent > 0 && emailsFailed > 0) {
      toast({
        title: "Invitaciones parcialmente enviadas",
        description: `Se enviaron ${emailsSent} de ${data.projects.length} invitaciones. Usuario registrado.`,
        variant: "default",
        duration: 5000,
      });
    } else {
      toast({
        title: "Usuario registrado",
        description: `El usuario fue agregado pero hubo un error al enviar el correo. Por favor reenvíe la invitación.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const updateCollaborator = async (id: string, data: Partial<Omit<ManualCollaborator, 'id' | 'createdAt' | 'type'>>) => {
    if (!(await checkSupportPermission())) return;

    setManualCollaborators(prev => prev.map(c =>
      c.id === id ? { ...c, ...data } : c
    ));
    toast({
      title: "Colaborador Actualizado",
      description: "Los datos han sido guardados."
    });
  };

  const updateSystemUserRole = async (userId: string, newRole: AppRole) => {
      // Logic to update role in DB for system user.
      if (!(await checkSupportPermission())) return;

      // Simplification: We will not implement full system user role update in this iteration unless explicitly needed.
      return;
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!(await checkSupportPermission())) return;

    const isManual = manualCollaborators.some(c => c.id === id);

    if (isManual) {
      setManualCollaborators(prev => prev.map(c =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      ));
      toast({
        title: "Estado Actualizado",
        description: `El acceso ha sido ${!currentStatus ? 'activado' : 'desactivado'}.`
      });
    } else {
      toast({
        title: "Acción no disponible",
        description: "Para usuarios del sistema, gestione su acceso eliminándolos del proyecto.",
        variant: "destructive"
      });
    }
  };

  const deleteCollaborator = async (id: string, type: 'manual' | 'system') => {
    if (!(await checkSupportPermission())) return;

    if (type === 'manual') {
      setManualCollaborators(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Colaborador eliminado",
        description: "El usuario ha sido eliminado correctamente.",
      });
    } else {
      // For system users, we remove all their project assignments (which effectively removes them from this view)
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', id);

      if (error) {
        toast({
          title: "Error al eliminar usuario",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido removido de todos los proyectos.",
      });
      refresh(); // Refresh to update list from DB
    }
  };

  return {
    collaborators,
    loading,
    availableProjects,
    addCollaborator,
    updateCollaborator,
    toggleStatus,
    deleteCollaborator,
    refresh
  };
}
