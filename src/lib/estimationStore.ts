import { create } from 'zustand';
import { Estimation, UserRole, CostCenter, Contract, EmailNotification } from '@/types/estimation';

interface EstimationStore {
  currentRole: UserRole;
  estimations: Estimation[];
  costCenters: CostCenter[];
  contracts: Contract[];
  emailNotifications: EmailNotification[];
  setCurrentRole: (role: UserRole) => void;
  addEstimation: (estimation: Omit<Estimation, 'id' | 'folio' | 'projectNumber' | 'createdAt' | 'status' | 'residentApprovedAt' | 'superintendentApprovedAt' | 'leaderApprovedAt' | 'comprasApprovedAt' | 'finanzasApprovedAt' | 'paidAt' | 'invoiceUrl' | 'history'>) => void;
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
    const now = new Date();
    const newEstimation: Estimation = {
      ...estimation,
      id: `EST-${Date.now()}`,
      folio: String(folioCounter++),
      projectNumber: String(projectCounter),
      createdAt: now,
      status: 'registered',
      history: [
        {
          status: 'registered',
          timestamp: now,
          role: 'contratista',
          userName: 'Contratista'
        }
      ]
    };
    
    set((state) => ({
      estimations: [newEstimation, ...state.estimations],
    }));

    // Send email notification
    const costCenter = get().costCenters.find(cc => cc.id === estimation.costCenterId);
    get().addEmailNotification({
      to: ['contratista', 'residente'],
      subject: 'Nueva Estimación Registrada',
      proyecto: costCenter?.name || 'Proyecto',
      numeroPedido: String(projectCounter),
      numeroFolio: String(folioCounter - 1),
      texto: estimation.estimationText,
      estimationId: newEstimation.id,
    });
  },
  
  updateEstimationStatus: (id, status, reason) => {
    const now = new Date();
    
    // Role mapping for history
    const roleMap: Record<string, { role: UserRole; userName: string }> = {
      'registered': { role: 'contratista', userName: 'Contratista' },
      'auth_resident': { role: 'residente', userName: 'Residente' },
      'auth_super': { role: 'superintendente', userName: 'Superintendente' },
      'auth_leader': { role: 'lider_proyecto', userName: 'Líder de Proyecto' },
      'validated_compras': { role: 'compras', userName: 'Compras' },
      'factura_subida': { role: 'contratista', userName: 'Contratista' },
      'validated_finanzas': { role: 'finanzas', userName: 'Finanzas' },
      'paid': { role: 'pagos', userName: 'Pagos (Juany)' }
    };
    
    set((state) => ({
      estimations: state.estimations.map((est) => {
        if (est.id !== id) return est;
        
        return {
          ...est,
          status,
          residentApprovedAt: status === 'auth_resident' ? now : est.residentApprovedAt,
          superintendentApprovedAt: status === 'auth_super' ? now : est.superintendentApprovedAt,
          leaderApprovedAt: status === 'auth_leader' ? now : est.leaderApprovedAt,
          comprasApprovedAt: status === 'validated_compras' ? now : est.comprasApprovedAt,
          finanzasApprovedAt: status === 'validated_finanzas' ? now : est.finanzasApprovedAt,
          paidAt: status === 'paid' ? now : est.paidAt,
          history: [
            ...est.history,
            {
              status,
              timestamp: now,
              role: roleMap[status].role,
              userName: roleMap[status].userName
            }
          ]
        };
      }),
    }));

    // Send appropriate email notification
    const estimation = get().estimations.find(e => e.id === id);
    if (!estimation) return;

    const costCenter = get().costCenters.find(cc => cc.id === estimation.costCenterId);
    
    if (status === 'auth_resident') {
      get().addEmailNotification({
        to: ['superintendente', 'residente'],
        subject: 'Estimación autorizada por Residente',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    } else if (status === 'auth_super') {
      get().addEmailNotification({
        to: ['lider_proyecto', 'superintendente', 'pagos'],
        subject: 'Estimación autorizada por Superintendente (Copia a Juany)',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    } else if (status === 'auth_leader') {
      get().addEmailNotification({
        to: ['compras', 'lider_proyecto'],
        subject: 'Estimación con Visto Bueno del Líder',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: estimation.estimationText,
        estimationId: id,
      });
    } else if (status === 'validated_compras') {
      get().addEmailNotification({
        to: ['contratista', 'compras'],
        subject: 'OC Generada - VÁLIDO PARA FACTURAR',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: 'La estimación ha sido validada por Compras y se generó la Orden de Compra.',
        estimationId: id,
      });
    } else if (status === 'validated_finanzas') {
      get().addEmailNotification({
        to: ['pagos', 'finanzas'],
        subject: 'Factura Validada - Listo para Pago',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: 'La factura ha sido validada por Finanzas.',
        estimationId: id,
      });
    } else if (status === 'paid') {
      get().addEmailNotification({
        to: ['contratista', 'pagos', 'finanzas'],
        subject: 'Pago Realizado',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: estimation.projectNumber,
        numeroFolio: estimation.folio,
        texto: 'El pago ha sido realizado exitosamente.',
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
