import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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

    // Call the database function to get the next status (considers active roles on estimation)
    const { data: nextStatus, error: statusError } = await supabase
      .rpc('get_next_approval_status_by_estimation', {
        _estimation_id: estimationId,
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
    // Get estimation role configuration (now stored on the estimation)
    const { data: estConfig } = await supabase
      .from('estimations')
      .select('*')
      .eq('id', estimationId)
      .single();

    if (estConfig) {
      const est = estConfig as any;
      // Calculate which roles should be auto-signed based on current status and next status
      const statusOrder = ['registered', 'auth_resident', 'auth_super', 'auth_leader', 'validated_compras'];
      const currentIdx = statusOrder.indexOf(estimation.status);
      const nextIdx = statusOrder.indexOf(nextStatus);

      // Auto-fill signatures for skipped roles
      for (let i = currentIdx + 1; i < nextIdx; i++) {
        const skippedStatus = statusOrder[i];
        switch (skippedStatus) {
          case 'auth_resident':
            if (!est.is_resident_active) {
              updateData.resident_approved_at = now;
              updateData.resident_signed_by = userName;
            }
            break;
          case 'auth_super':
            if (!est.is_superintendent_active) {
              updateData.superintendent_approved_at = now;
              updateData.superintendent_signed_by = userName;
            }
            break;
          case 'auth_leader':
            if (!est.is_leader_active) {
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

    // Send authorization email in background
    try {
      // We don't await this to avoid blocking the UI response
      supabase.functions.invoke('send-authorization-email', {
        body: { estimation_id: estimationId }
      }).then(({ error }) => {
        if (error) {
          console.error('Error sending authorization email:', error);
          toast.error("No se pudo enviar el correo de autorización");
        }
      });
    } catch (e) {
      console.error('Failed to trigger email function:', e);
      toast.error("Error al intentar enviar el correo");
    }

    await fetchEstimations();
    return nextStatus;
  };

  const uploadInvoice = async (
    estimationId: string, 
    pdfFile: File, 
    xmlFile: File, 
    userName: string
  ) => {
    if (!user || !projectId) throw new Error('No authenticated user or project');

    // Upload PDF file to storage
    const pdfPath = `${projectId}/${estimationId}/factura_${Date.now()}.pdf`;
    const { error: pdfUploadError } = await supabase.storage
      .from('estimations')
      .upload(pdfPath, pdfFile, { upsert: true });

    if (pdfUploadError) throw pdfUploadError;

    // Upload XML file to storage
    const xmlPath = `${projectId}/${estimationId}/factura_${Date.now()}.xml`;
    const { error: xmlUploadError } = await supabase.storage
      .from('estimations')
      .upload(xmlPath, xmlFile, { upsert: true });

    if (xmlUploadError) throw xmlUploadError;

    // Get public URLs
    const { data: pdfUrlData } = supabase.storage
      .from('estimations')
      .getPublicUrl(pdfPath);

    const { data: xmlUrlData } = supabase.storage
      .from('estimations')
      .getPublicUrl(xmlPath);

    const { error: updateError } = await supabase
      .from('estimations')
      .update({
        invoice_url: pdfUrlData.publicUrl,
        invoice_xml_url: xmlUrlData.publicUrl,
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
    pdf_details?: Record<string, any>;
  }) => {
    if (!user || !projectId) throw new Error('No authenticated user or project');

    // Get default configuration from project
    const { data: projectConfig } = await supabase
      .from('projects')
      .select('is_resident_active, is_superintendent_active, is_leader_active')
      .eq('id', projectId)
      .single();

    // Default to true if not found
    const defaults = {
        is_resident_active: true,
        is_superintendent_active: true,
        is_leader_active: true,
        ...projectConfig
    };

    // Calculate initial status based on active roles
    // If a role is inactive, skip to the next active one
    let initialStatus: EstimationStatus = 'registered';
    if (!defaults.is_resident_active) {
      if (defaults.is_superintendent_active) {
        initialStatus = 'auth_resident';
      } else if (defaults.is_leader_active) {
        initialStatus = 'auth_super';
      } else {
        initialStatus = 'auth_leader';
      }
    }

    // Insert with calculated initial status and project defaults
    const { data: estimation, error: insertError } = await supabase
      .from('estimations')
      .insert({
        ...data,
        project_id: projectId,
        created_by: user.id,
        status: initialStatus,
        is_resident_active: defaults.is_resident_active,
        is_superintendent_active: defaults.is_superintendent_active,
        is_leader_active: defaults.is_leader_active
      } as any)
      .select()
      .single();

    if (insertError) throw insertError;

    // Add initial history entry
    await supabase.from('approval_history').insert({
      estimation_id: estimation.id,
      status: initialStatus,
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
