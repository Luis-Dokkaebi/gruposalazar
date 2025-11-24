export type UserRole = 
  | "contratista"
  | "residente" 
  | "superintendente"
  | "lider_proyecto"
  | "compras"
  | "contabilidad"
  | "almacen";

export type EstimationStatus = 
  | "pendiente_residente"
  | "rechazado_residente"
  | "pendiente_superintendente"
  | "rechazado_superintendente"
  | "pendiente_lider"
  | "rechazado_lider"
  | "pendiente_compras"
  | "programado_pago"
  | "pago_realizado"
  | "material_recibido";

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
  rejectionReason?: string;
  estimationText: string;
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
