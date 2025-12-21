import type { Database } from '@/integrations/supabase/types';
import type { Estimation, ApprovalHistoryEntry } from '@/types/estimation';

type DbEstimation = Database['public']['Tables']['estimations']['Row'];
type DbApprovalHistory = Database['public']['Tables']['approval_history']['Row'];

interface DbEstimationWithHistory extends DbEstimation {
  history?: DbApprovalHistory[];
}

/**
 * Maps a database estimation to the frontend Estimation type
 */
export function mapDbEstimationToFrontend(dbEstimation: DbEstimationWithHistory): Estimation {
  return {
    id: dbEstimation.id,
    folio: dbEstimation.folio,
    projectNumber: dbEstimation.project_number,
    contractId: dbEstimation.contract_id || '',
    costCenterId: dbEstimation.cost_center_id || '',
    contractorName: dbEstimation.contractor_name,
    pdfUrl: dbEstimation.pdf_url || '',
    status: dbEstimation.status,
    createdAt: new Date(dbEstimation.created_at || Date.now()),
    residentApprovedAt: dbEstimation.resident_approved_at ? new Date(dbEstimation.resident_approved_at) : undefined,
    superintendentApprovedAt: dbEstimation.superintendent_approved_at ? new Date(dbEstimation.superintendent_approved_at) : undefined,
    leaderApprovedAt: dbEstimation.leader_approved_at ? new Date(dbEstimation.leader_approved_at) : undefined,
    comprasApprovedAt: dbEstimation.compras_approved_at ? new Date(dbEstimation.compras_approved_at) : undefined,
    finanzasApprovedAt: dbEstimation.finanzas_approved_at ? new Date(dbEstimation.finanzas_approved_at) : undefined,
    paidAt: dbEstimation.paid_at ? new Date(dbEstimation.paid_at) : undefined,
    invoiceUrl: dbEstimation.invoice_url || undefined,
    estimationText: dbEstimation.estimation_text || '',
    amount: Number(dbEstimation.amount),
    history: (dbEstimation.history || []).map(mapDbHistoryToFrontend),
    // Signature inheritance fields
    resident_signed_by: (dbEstimation as any).resident_signed_by || null,
    superintendent_signed_by: (dbEstimation as any).superintendent_signed_by || null,
    leader_signed_by: (dbEstimation as any).leader_signed_by || null,
    // Raw DB fields for ApprovalSummary
    resident_approved_at: dbEstimation.resident_approved_at,
    superintendent_approved_at: dbEstimation.superintendent_approved_at,
    leader_approved_at: dbEstimation.leader_approved_at,
    compras_approved_at: dbEstimation.compras_approved_at,
  };
}

/**
 * Maps a database approval history entry to the frontend type
 */
export function mapDbHistoryToFrontend(dbHistory: DbApprovalHistory): ApprovalHistoryEntry {
  return {
    status: dbHistory.status,
    timestamp: new Date(dbHistory.timestamp || Date.now()),
    role: dbHistory.role,
    userName: dbHistory.user_name || undefined,
  };
}
