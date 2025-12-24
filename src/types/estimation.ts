export type UserRole = 
  | "contratista"
  | "residente" 
  | "superintendente"
  | "lider_proyecto"
  | "compras"
  | "finanzas"
  | "pagos"
  | "soporte_tecnico";

export type EstimationStatus = 
  | "registered"
  | "auth_resident" 
  | "auth_super"
  | "auth_leader"
  | "validated_compras"
  | "factura_subida"
  | "validated_finanzas"
  | "paid";

export type CostCenterStatus = "inicio" | "proceso" | "cierre";

export interface CostCenter {
  id: string;
  name: string;
  status: CostCenterStatus;
  budget: number;
  progress: number;
}

export interface Contract {
  id: string;
  name: string;
  concepts: ContractConcept[];
}

export interface ContractConcept {
  id: string;
  code: string;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

export interface ApprovalHistoryEntry {
  status: EstimationStatus;
  timestamp: Date;
  role: UserRole;
  userName?: string;
}

export interface Estimation {
  id: string;
  folio: string;
  projectNumber: string;
  contractId: string;
  costCenterId: string;
  contractorName: string;
  pdfUrl: string;
  status: EstimationStatus;
  createdAt: Date;
  residentApprovedAt?: Date;
  superintendentApprovedAt?: Date;
  leaderApprovedAt?: Date;
  comprasApprovedAt?: Date;
  finanzasApprovedAt?: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  estimationText: string;
  amount: number;
  history: ApprovalHistoryEntry[];
  // Inheritance signature fields
  resident_signed_by?: string | null;
  superintendent_signed_by?: string | null;
  leader_signed_by?: string | null;
  // DB format fields for compatibility
  resident_approved_at?: string | null;
  superintendent_approved_at?: string | null;
  leader_approved_at?: string | null;
  compras_approved_at?: string | null;
}

export interface EmailNotification {
  to: UserRole[];
  subject: string;
  proyecto: string;
  numeroPedido: string;
  numeroFolio: string;
  texto: string;
  estimationId: string;
}
