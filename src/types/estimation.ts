export type UserRole = 
  | "contratista"
  | "residente" 
  | "superintendente"
  | "lider_proyecto"
  | "compras"
  | "finanzas"
  | "pagos";

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
