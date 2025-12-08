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

    // Get the estimation
    const { data: estimation, error: estError } = await supabase
      .from('estimations')
      .select('status')
      .eq('id', estimationId)
      .single();

    if (estError) throw estError;

    // Call the database function to get the next status
    const { data: nextStatus, error: statusError } = await supabase
      .rpc('get_next_approval_status', {
        _project_id: projectId,
        _current_status: estimation.status
      });

    if (statusError) throw statusError;

    // Update the estimation
    const updateData: Partial<Estimation> = {
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

    const { error: updateError } = await supabase
      .from('estimations')
      .update(updateData)
      .eq('id', estimationId);

    if (updateError) throw updateError;

    // Add to approval history
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
