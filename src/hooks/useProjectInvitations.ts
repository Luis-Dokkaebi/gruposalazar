import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function useProjectInvitations(projectId: string | null) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createInvitation = async (role: AppRole, email?: string, expiresInDays: number = 7) => {
    if (!user || !projectId) throw new Error('No authenticated user or project');

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_project_invitation', {
        _project_id: projectId,
        _role: role,
        _email: email || null,
        _expires_in_days: expiresInDays
      });

      if (error) throw error;

      // Get the invitation token
      const { data: invitation, error: fetchError } = await supabase
        .from('project_invitations')
        .select('token')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      // Generate the invitation link
      const inviteUrl = `${window.location.origin}/invite?token=${invitation.token}`;
      
      return inviteUrl;
    } finally {
      setLoading(false);
    }
  };

  const getProjectMembers = async () => {
    if (!projectId) return [];

    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles (email, full_name)
      `)
      .eq('project_id', projectId);

    if (error) throw error;

    return data || [];
  };

  const addMemberDirectly = async (userId: string, role: AppRole) => {
    if (!projectId) throw new Error('No project selected');

    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role
      });

    if (error) throw error;
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  };

  return {
    loading,
    createInvitation,
    getProjectMembers,
    addMemberDirectly,
    removeMember
  };
}
