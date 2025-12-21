import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Estimation = Database['public']['Tables']['estimations']['Row'];
type ApprovalHistory = Database['public']['Tables']['approval_history']['Row'];
type EstimationStatus = Database['public']['Enums']['estimation_status'];
type AppRole = Database['public']['Enums']['app_role'];

interface EstimationWithHistory extends Estimation {
  history: ApprovalHistory[];
}

export function useProjectEstimations(projectId: string | null) {
  const { user } = useAuth();
  const [estimations, setEstimations] = useState<EstimationWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimations = useCallback(async () => {
    if (!projectId || !user) {
      setEstimations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('estimations')
        .select(`
          *,
          approval_history (*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((est: any) => ({
        ...est,
        history: est.approval_history || []
      }));

      setEstimations(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchEstimations();
  }, [fetchEstimations]);

  const approveEstimation = async (
    estimationId: string,
    currentRole: AppRole,
    userName: string
  ) => {
    if (!user || !projectId) throw new Error('No authenticated user or project');

    // Get the estimation current status
    const { data: estimation, error: estError } = await supabase
      .from('estimations')
      .select('status')
      .eq('id', estimationId)
      .single();

    if (estError) throw estError;

    // Call the database function to get the next status (considers active roles)
    const { data: nextStatus, error: statusError } = await supabase
      .rpc('get_next_approval_status', {
        _project_id: projectId,
        _current_status: estimation.status
      });

    if (statusError) throw statusError;

    // Prepare update data
    const updateData: Record<string, any> = {
      status: nextStatus as EstimationStatus
    };

    // Set approval timestamps based on role
    const now = new Date().toISOString();
    switch (currentRole) {
      case 'residente':
        updateData.resident_approved_at = now;
        break;
      case 'superintendente':
        updateData.superintendent_approved_at = now;
        break;
      case 'lider_proyecto':
        updateData.leader_approved_at = now;
        break;
      case 'compras':
        updateData.compras_approved_at = now;
        break;
      case 'finanzas':
        updateData.finanzas_approved_at = now;
        break;
      case 'pagos':
        updateData.paid_at = now;
        break;
    }

    // Handle signature inheritance for skipped roles
    // Get project role configuration
    const { data: projectConfig } = await supabase
      .from('projects')
      .select('is_resident_active, is_superintendent_active, is_leader_active')
      .eq('id', projectId)
      .single();

    if (projectConfig) {
      // Calculate which roles should be auto-signed based on current status and next status
      const statusOrder = ['registered', 'auth_resident', 'auth_super', 'auth_leader', 'validated_compras'];
      const currentIdx = statusOrder.indexOf(estimation.status);
      const nextIdx = statusOrder.indexOf(nextStatus);

      // Auto-fill signatures for skipped roles
      for (let i = currentIdx + 1; i < nextIdx; i++) {
        const skippedStatus = statusOrder[i];
        switch (skippedStatus) {
          case 'auth_resident':
            if (!projectConfig.is_resident_active) {
              updateData.resident_approved_at = now;
              updateData.resident_signed_by = userName;
            }
            break;
          case 'auth_super':
            if (!projectConfig.is_superintendent_active) {
              updateData.superintendent_approved_at = now;
              updateData.superintendent_signed_by = userName;
            }
            break;
          case 'auth_leader':
            if (!projectConfig.is_leader_active) {
              updateData.leader_approved_at = now;
              updateData.leader_signed_by = userName;
            }
            break;
        }
      }
    }

    // Update the estimation
    const { error: updateError } = await supabase
      .from('estimations')
      .update(updateData)
      .eq('id', estimationId);

    if (updateError) throw updateError;

    // Add to approval history (main approval)
    const { error: historyError } = await supabase
      .from('approval_history')
      .insert({
        estimation_id: estimationId,
        status: nextStatus as EstimationStatus,
        role: currentRole,
        user_id: user.id,
        user_name: userName
      });

    if (historyError) throw historyError;

    await fetchEstimations();
    return nextStatus;
  };

  const uploadInvoice = async (estimationId: string, invoiceUrl: string, userName: string) => {
    if (!user) throw new Error('No authenticated user');

    const { error: updateError } = await supabase
      .from('estimations')
      .update({
        invoice_url: invoiceUrl,
        invoice_uploaded_at: new Date().toISOString(),
        status: 'factura_subida' as EstimationStatus
      })
      .eq('id', estimationId);

    if (updateError) throw updateError;

    // Add to approval history
    const { error: historyError } = await supabase
      .from('approval_history')
      .insert({
        estimation_id: estimationId,
        status: 'factura_subida' as EstimationStatus,
        role: 'contratista' as AppRole,
        user_id: user.id,
        user_name: userName
      });

    if (historyError) throw historyError;

    await fetchEstimations();
  };

  const createEstimation = async (data: {
    folio: string;
    project_number: string;
    contractor_name: string;
    amount: number;
    estimation_text?: string;
    contract_id?: string;
    cost_center_id?: string;
    pdf_url?: string;
  }) => {
    if (!user || !projectId) throw new Error('No authenticated user or project');

    // Get the initial status based on project roles
    const { data: initialStatus, error: statusError } = await supabase
      .rpc('get_next_approval_status', {
        _project_id: projectId,
        _current_status: 'registered' as EstimationStatus
      });

    // Insert with 'registered' status, then update based on cascade logic
    const { data: estimation, error: insertError } = await supabase
      .from('estimations')
      .insert({
        ...data,
        project_id: projectId,
        created_by: user.id,
        status: 'registered' as EstimationStatus
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Add initial history entry
    await supabase.from('approval_history').insert({
      estimation_id: estimation.id,
      status: 'registered' as EstimationStatus,
      role: 'contratista' as AppRole,
      user_id: user.id,
      user_name: 'Contratista'
    });

    await fetchEstimations();
    return estimation;
  };

  return {
    estimations,
    loading,
    error,
    approveEstimation,
    uploadInvoice,
    createEstimation,
    refetch: fetchEstimations
  };
}
