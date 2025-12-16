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

// Mock estimations for testing the complete workflow
const mockEstimations: Estimation[] = [
  {
    id: 'EST-TEST-001',
    folio: '2975',
    projectNumber: '137',
    contractId: '1',
    costCenterId: 'CC-2024-001',
    contractorName: 'Constructora ABC',
    pdfUrl: '#',
    status: 'registered',
    createdAt: new Date('2025-11-20T09:00:00'),
    estimationText: 'Estimación de prueba - Pendiente Residente',
    amount: 125000,
    history: [
      {
        status: 'registered',
        timestamp: new Date('2025-11-20T09:00:00'),
        role: 'contratista',
        userName: 'Contratista'
      }
    ]
  },
  {
    id: 'EST-TEST-002',
    folio: '2976',
    projectNumber: '137',
    contractId: '1',
    costCenterId: 'CC-2024-001',
    contractorName: 'Constructora XYZ',
    pdfUrl: '#',
    status: 'auth_resident',
    createdAt: new Date('2025-11-21T10:00:00'),
    residentApprovedAt: new Date('2025-11-21T14:30:00'),
    estimationText: 'Estimación de prueba - Pendiente Superintendente',
    amount: 85000,
    history: [
      {
        status: 'registered',
        timestamp: new Date('2025-11-21T10:00:00'),
        role: 'contratista',
        userName: 'Contratista'
      },
      {
        status: 'auth_resident',
        timestamp: new Date('2025-11-21T14:30:00'),
        role: 'residente',
        userName: 'Residente'
      }
    ]
  },
  {
    id: 'EST-TEST-003',
    folio: '2977',
    projectNumber: '137',
    contractId: '2',
    costCenterId: 'CC-2024-002',
    contractorName: 'Obras Industriales SA',
    pdfUrl: '#',
    status: 'auth_super',
    createdAt: new Date('2025-11-22T08:00:00'),
    residentApprovedAt: new Date('2025-11-22T11:00:00'),
    superintendentApprovedAt: new Date('2025-11-22T15:45:00'),
    estimationText: 'Estimación de prueba - Pendiente Líder de Proyecto',
    amount: 195000,
    history: [
      {
        status: 'registered',
        timestamp: new Date('2025-11-22T08:00:00'),
        role: 'contratista',
        userName: 'Contratista'
      },
      {
        status: 'auth_resident',
        timestamp: new Date('2025-11-22T11:00:00'),
        role: 'residente',
        userName: 'Residente'
      },
      {
        status: 'auth_super',
        timestamp: new Date('2025-11-22T15:45:00'),
        role: 'superintendente',
        userName: 'Superintendente'
      }
    ]
  },
  {
    id: 'EST-TEST-004',
    folio: '2978',
    projectNumber: '137',
    contractId: '1',
    costCenterId: 'CC-2024-001',
    contractorName: 'Constructora DEF',
    pdfUrl: '#',
    status: 'auth_leader',
    createdAt: new Date('2025-11-23T09:00:00'),
    residentApprovedAt: new Date('2025-11-23T12:00:00'),
    superintendentApprovedAt: new Date('2025-11-23T14:00:00'),
    leaderApprovedAt: new Date('2025-11-23T16:30:00'),
    estimationText: 'Estimación de prueba - Pendiente Compras (ESTE DEBE VER COMPRAS)',
    amount: 275000,
    history: [
      {
        status: 'registered',
        timestamp: new Date('2025-11-23T09:00:00'),
        role: 'contratista',
        userName: 'Contratista'
      },
      {
        status: 'auth_resident',
        timestamp: new Date('2025-11-23T12:00:00'),
        role: 'residente',
        userName: 'Residente'
      },
      {
        status: 'auth_super',
        timestamp: new Date('2025-11-23T14:00:00'),
        role: 'superintendente',
        userName: 'Superintendente'
      },
      {
        status: 'auth_leader',
        timestamp: new Date('2025-11-23T16:30:00'),
        role: 'lider_proyecto',
        userName: 'Líder de Proyecto'
      }
    ]
  }
];

// Project configuration interface
export interface ProjectConfig {
  requiresResident: boolean;
  requiresSuperintendent: boolean;
  requiresLeader: boolean;
}

interface EstimationStore {
  currentRole: UserRole;
  estimations: Estimation[];
  costCenters: CostCenter[];
  contracts: Contract[];
  emailNotifications: EmailNotification[];
  projectConfig: ProjectConfig;
  setCurrentRole: (role: UserRole) => void;
  setProjectConfig: (config: Partial<ProjectConfig>) => void;
  addEstimation: (estimation: Omit<Estimation, 'id' | 'folio' | 'projectNumber' | 'createdAt' | 'status' | 'residentApprovedAt' | 'superintendentApprovedAt' | 'leaderApprovedAt' | 'comprasApprovedAt' | 'finanzasApprovedAt' | 'paidAt' | 'invoiceUrl' | 'history'>) => void;
  updateEstimationStatus: (id: string, status: Estimation['status'], reason?: string) => void;
  addEmailNotification: (notification: EmailNotification) => void;
  clearEmailNotifications: () => void;
}

// Helper to determine the *initial* status based on config
// Used when creating a new estimation.
export const getInitialStatus = (config: ProjectConfig): Estimation['status'] => {
  // Normally starts at 'registered' (Pending Resident).
  // If Resident is skipped, it should start at 'auth_resident' (Pending Super).
  // If Super is skipped, it should start at 'auth_super' (Pending Leader).
  // etc.

  if (config.requiresResident) return 'registered';
  if (config.requiresSuperintendent) return 'auth_resident';
  if (config.requiresLeader) return 'auth_super';
  return 'auth_leader'; // Ready for Compras (wait, Compras expects 'auth_leader' status?)
  // Yes:
  // 'auth_leader': Approved by Leader -> Pendiente Compras.
  // So if everyone is skipped, we land in 'auth_leader' which means "Ready for Compras".
};

// Helper to determine next status based on config
// This function takes the CURRENT status and returns the NEXT status
// skipping any disabled steps.
const getNextStatus = (currentStatus: Estimation['status'], config: ProjectConfig): Estimation['status'] => {

  // Helper to check if a "target status" is valid (i.e. the role required for it is enabled)
  // or if we should skip past it.

  // Logic:
  // If we are moving FROM 'registered' (Resident Approved):
  //   Normal destination: 'auth_resident' (Pending Super).
  //   Check if Super is required.
  //   If Super required -> return 'auth_resident'.
  //   If Super skipped -> we treat 'auth_resident' as auto-approved -> move to 'auth_super'.

  switch (currentStatus) {
    case 'registered':
      // Current: Registered (Pending Resident).
      // Event: Resident Approves.
      // Next Logical: 'auth_resident' (Pending Super).
      if (config.requiresSuperintendent) return 'auth_resident';
      // Super skipped. Next: 'auth_super' (Pending Leader).
      if (config.requiresLeader) return 'auth_super';
      // Leader skipped. Next: 'auth_leader' (Pending Compras).
      return 'auth_leader';

    case 'auth_resident':
      // Current: Auth Resident (Pending Super).
      // Event: Super Approves.
      // Next Logical: 'auth_super' (Pending Leader).
      if (config.requiresLeader) return 'auth_super';
      // Leader skipped. Next: 'auth_leader' (Pending Compras).
      return 'auth_leader';

    case 'auth_super':
      // Current: Auth Super (Pending Leader).
      // Event: Leader Approves.
      // Next Logical: 'auth_leader' (Pending Compras).
      return 'auth_leader';

    case 'auth_leader':
      // Current: Auth Leader (Pending Compras).
      // Event: Compras Validates.
      return 'validated_compras';

    case 'validated_compras':
      return 'factura_subida';

    case 'factura_subida':
      return 'validated_finanzas';

    case 'validated_finanzas':
      return 'paid';

    default:
      return currentStatus;
  }
};

export const useEstimationStore = create<EstimationStore>((set, get) => ({
  currentRole: 'contratista',
  estimations: mockEstimations,
  costCenters: mockCostCenters,
  projectConfig: {
    requiresResident: true,
    requiresSuperintendent: true,
    requiresLeader: true,
  },
  contracts: mockContracts,
  emailNotifications: [],
  
  setCurrentRole: (role) => set({ currentRole: role }),
  setProjectConfig: (config) => set((state) => ({
    projectConfig: { ...state.projectConfig, ...config }
  })),
  
  addEstimation: (estimation) => {
    const now = new Date();
    const initialStatus = getInitialStatus(get().projectConfig);
    const newEstimation: Estimation = {
      ...estimation,
      id: `EST-${Date.now()}`,
      folio: String(folioCounter++),
      projectNumber: String(projectCounter),
      createdAt: now,
      status: initialStatus,
      history: [
        {
          status: initialStatus,
          timestamp: now,
          role: 'contratista',
          userName: 'Contratista'
        }
      ]
    };
    
    set((state) => ({
      estimations: [newEstimation, ...state.estimations],
    }));

    // Send email notification dynamically based on initial status
    const costCenter = get().costCenters.find(cc => cc.id === estimation.costCenterId);
    let to: UserRole[] = ['contratista'];
    let subject = 'Nueva Estimación Registrada';

    if (initialStatus === 'registered') {
      to.push('residente');
    } else if (initialStatus === 'auth_resident') {
      to.push('superintendente');
      subject = 'Nueva Estimación (Pendiente Superintendente)';
    } else if (initialStatus === 'auth_super') {
      to.push('lider_proyecto');
      subject = 'Nueva Estimación (Pendiente Líder)';
    } else if (initialStatus === 'auth_leader') {
      to.push('compras');
      subject = 'Nueva Estimación (Pendiente Compras)';
    }

    get().addEmailNotification({
      to,
      subject,
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
        
        // Calculate dynamic next status if we are just approving (moving forward)
        let nextStatus = status;
        // Basic check: if we are moving from a known state to the "next" state,
        // we should respect the config.
        // Note: The UI usually calls this with a hardcoded next status.
        // Ideally the UI should ask "what is next?" but here we intercept.

        // However, the `status` argument passed here IS the target status.
        // If the UI says "move to auth_resident" but resident is disabled,
        // we should instead move to the *actual* next status.

        // Let's rely on the previous status to determine the next one dynamically
        if (est.status !== status) {
           // We are changing status. Let's see what the "next" one *should* be
           // based on current logic vs config.
           // Note: This logic assumes sequential forward movement.
           const calculatedNext = getNextStatus(est.status, state.projectConfig);

           // If the requested status (from UI button) matches the 'natural' next step
           // of the default flow (e.g. registered -> auth_resident),
           // BUT the config says skip it, we should use the calculated next.

           // Actually, it's safer to just *use* the calculated next status
           // if we are in an approval flow.

           // If status is 'paid' or 'factura_subida' etc, we might not need this.
           // But for the approval chain:
           if (['auth_resident', 'auth_super', 'auth_leader', 'validated_compras'].includes(status)) {
             nextStatus = calculatedNext;
           }
        }

        return {
          ...est,
          status: nextStatus,
          residentApprovedAt: status === 'auth_resident' ? now : est.residentApprovedAt,
          superintendentApprovedAt: status === 'auth_super' ? now : est.superintendentApprovedAt,
          leaderApprovedAt: status === 'auth_leader' ? now : est.leaderApprovedAt,
          comprasApprovedAt: status === 'validated_compras' ? now : est.comprasApprovedAt,
          finanzasApprovedAt: status === 'validated_finanzas' ? now : est.finanzasApprovedAt,
          paidAt: status === 'paid' ? now : est.paidAt,
          history: [
            ...est.history,
            {
              status: nextStatus,
              timestamp: now,
              role: roleMap[nextStatus]?.role || 'soporte',
              userName: roleMap[nextStatus]?.userName || 'Soporte'
            }
          ]
        };
      }),
    }));

    // Send appropriate email notification
    // We need to re-fetch status because it might have changed due to dynamic logic above
    const updatedEstimation = get().estimations.find(e => e.id === id);
    if (!updatedEstimation) return;
    const finalStatus = updatedEstimation.status;

    const costCenter = get().costCenters.find(cc => cc.id === updatedEstimation.costCenterId);

    // Note: If a role was skipped, the notification should reflect that we advanced TO the next role.
    // We already calculated the correct *target* status in `finalStatus`.
    // The subject lines here assume "Approved by X". We should perhaps generalize them or
    // leave them as is, implying "Passed X stage".
    // For simplicity and user expectation, if we land in 'auth_resident', we notify Super.
    
    if (finalStatus === 'auth_resident') {
      get().addEmailNotification({
        to: ['superintendente', 'residente'],
        subject: 'Estimación disponible para Superintendente', // Changed from "autorizada por Residente" to be more generic if skipped
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
        texto: updatedEstimation.estimationText,
        estimationId: id,
      });
    } else if (finalStatus === 'auth_super') {
      get().addEmailNotification({
        to: ['lider_proyecto', 'superintendente', 'pagos'],
        subject: 'Estimación disponible para Líder de Proyecto',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
        texto: updatedEstimation.estimationText,
        estimationId: id,
      });
    } else if (finalStatus === 'auth_leader') {
      get().addEmailNotification({
        to: ['compras', 'lider_proyecto'],
        subject: 'Estimación disponible para Compras',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
        texto: updatedEstimation.estimationText,
        estimationId: id,
      });
    } else if (finalStatus === 'validated_compras') {
      get().addEmailNotification({
        to: ['contratista', 'compras'],
        subject: 'OC Generada - VÁLIDO PARA FACTURAR',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
        texto: 'La estimación ha sido validada por Compras y se generó la Orden de Compra.',
        estimationId: id,
      });
    } else if (finalStatus === 'validated_finanzas') {
      get().addEmailNotification({
        to: ['pagos', 'finanzas'],
        subject: 'Factura Validada - Listo para Pago',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
        texto: 'La factura ha sido validada por Finanzas.',
        estimationId: id,
      });
    } else if (finalStatus === 'paid') {
      get().addEmailNotification({
        to: ['contratista', 'pagos', 'finanzas'],
        subject: 'Pago Realizado',
        proyecto: costCenter?.name || 'Proyecto',
        numeroPedido: updatedEstimation.projectNumber,
        numeroFolio: updatedEstimation.folio,
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
