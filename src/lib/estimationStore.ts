import { create } from 'zustand';
import { Estimation, UserRole, CostCenter, Contract, EmailNotification } from '@/types/estimation';

interface EstimationStore {
  currentRole: UserRole;
  estimations: Estimation[];
  costCenters: CostCenter[];
  contracts: Contract[];
  emailNotifications: EmailNotification[];
  setCurrentRole: (role: UserRole) => void;
  addEstimation: (estimation: Omit<Estimation, 'id' | 'folio' | 'projectNumber' | 'createdAt'>) => void;
  updateEstimationStatus: (id: string, status: Estimation['status'], reason?: string) => void;
  addEmailNotification: (notification: EmailNotification) => void;
  clearEmailNotifications: () => void;
}

// Mock data
const mockCostCenters: CostCenter[] = [
  { id: 'CC-2024-001', name: 'Expansion de edificio NIDEC', status: 'proceso', budget: 8500000, progress: 42 },
  { id: 'CC-2024-002', name: 'Construcción Nave Industrial', status: 'inicio', budget: 12300000, progress: 8 },
  { id: 'CC-2024-003', name: 'Remodelación Oficinas', status: 'cierre', budget: 3200000, progress: 87 },
];

const mockContracts: Contract[] = [
  {
    id: '1',
    name: 'Segundo Contrato - NIDEC',
    concepts: [
      { id: '1', code: 'C001', description: 'Cimentación', unit: 'm3', unitPrice: 1500, quantity: 100 },
      { id: '2', code: 'C002', description: 'Estructura metálica', unit: 'ton', unitPrice: 25000, quantity: 50 },
      { id: '3', code: 'C003', description: 'Acabados', unit: 'm2', unitPrice: 450, quantity: 500 },
    ],
  },
  {
    id: '2',
    name: 'Primer Contrato - Obras Civiles',
    concepts: [
      { id: '4', code: 'C010', description: 'Excavación', unit: 'm3', unitPrice: 120, quantity: 200 },
      { id: '5', code: 'C011', description: 'Concreto armado', unit: 'm3', unitPrice: 2500, quantity: 80 },
    ],
  },
];

let folioCounter = 2979;
let projectCounter = 137;

export const useEstimationStore = create<EstimationStore>((set, get) => ({
  currentRole: 'contratista',
  estimations: [],
  costCenters: mockCostCenters,
  contracts: mockContracts,
  emailNotifications: [],
  
  setCurrentRole: (role) => set({ currentRole: role }),
  
  addEstimation: (estimation) => {
    const newEstimation: Estimation = {
      ...estimation,
      id: `EST-${Date.now()}`,
      folio: String(folioCounter++),
      projectNumber: String(projectCounter),
      createdAt: new Date(),
      status: 'pendiente_residente',
    };
    
    set((state) => ({
      estimations: [newEstimation, ...state.estimations],
    }));

    // Send email notification
    const costCenter = get().costCenters.find(cc => cc.id === estimation.costCenterId);
    get().addEmailNotification({
      to: ['contratista', 'residente'],
      subject: 'Nueva Estimación Recibida',
      proyecto: costCenter?.name || 'Proyecto',
      numeroPedido: String(projectCounter),
      numeroFolio: String(folioCounter - 1),
      texto: estimation.estimationText,
      estimationId: newEstimation.id,
    });
  },
  
  updateEstimationStatus: (id, status, reason) => {
    set((state) => ({
      estimations: state.estimations.map((est) =>
        est.id === id
          ? {
              ...est,
              status,
              rejectionReason: reason,
              residentApprovedAt: status === 'pendiente_superintendente' ? new Date() : est.residentApprovedAt,
              superintendentApprovedAt: status === 'pendiente_lider' ? new Date() : est.superintendentApprovedAt,
              leaderApprovedAt: status === 'pendiente_compras' ? new Date() : est.leaderApprovedAt,
            }
          : est
      ),
    }));

    // Send appropriate email notification
    const estimation = get().estimations.find(e => e.id === id);
    if (!estimation) return;

    const costCenter = get().costCenters.find(cc => cc.id === estimation.costCenterId);
    
    if (status.includes('rechazado')) {
      get().addEmailNotification({
        to: ['contratista', 'residente'],
        subject: 'Estimación Rechazada',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: `Estimación rechazada. Razón: ${reason}`,
        estimationId: id,
      });
    } else if (status === 'pendiente_superintendente') {
      get().addEmailNotification({
        to: ['superintendente', 'residente'],
        subject: 'Pre estimación autorizada por Residente',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    } else if (status === 'pendiente_lider') {
      get().addEmailNotification({
        to: ['lider_proyecto', 'superintendente'],
        subject: 'Pre estimación autorizada por Superintendente',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    } else if (status === 'pendiente_compras') {
      get().addEmailNotification({
        to: ['compras', 'lider_proyecto'],
        subject: 'Estimación Autorizada - Control de Compras',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    }
  },
  
  addEmailNotification: (notification) =>
    set((state) => ({
      emailNotifications: [notification, ...state.emailNotifications],
    })),
    
  clearEmailNotifications: () => set({ emailNotifications: [] }),
}));
