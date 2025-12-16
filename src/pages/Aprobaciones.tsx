import { useState } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, AlertCircle } from "lucide-react";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import { Estimation, UserRole } from "@/types/estimation";

const statusConfig: Record<string, { label: string; variant: string; badge: string }> = {
  registered: { label: "Pendiente Residente", variant: "warning", badge: "bg-amber-100 text-amber-700" },
  auth_resident: { label: "Pendiente Superintendente", variant: "default", badge: "bg-blue-100 text-blue-700" },
  auth_super: { label: "Pendiente Líder", variant: "default", badge: "bg-indigo-100 text-indigo-700" },
  auth_leader: { label: "Pendiente Compras", variant: "default", badge: "bg-purple-100 text-purple-700" },
  validated_compras: { label: "Validado - Pendiente Factura", variant: "success", badge: "bg-green-100 text-green-700" },
  factura_subida: { label: "Factura Subida - Pendiente Finanzas", variant: "default", badge: "bg-teal-100 text-teal-700" },
  validated_finanzas: { label: "Pendiente Pago", variant: "default", badge: "bg-cyan-100 text-cyan-700" },
  paid: { label: "Pagado", variant: "success", badge: "bg-emerald-100 text-emerald-700" },
};

const getFilteredEstimations = (estimations: Estimation[], role: UserRole): Estimation[] => {
  // Define the sequence order of statuses
  const statusOrder: Record<string, number> = {
    'registered': 0,
    'auth_resident': 1,
    'auth_super': 2,
    'auth_leader': 3,
    'validated_compras': 4,
    'factura_subida': 5,
    'validated_finanzas': 6,
    'paid': 7
  };

  // Define the "active" status for each role
  let roleActiveStatus = '';
  switch (role) {
    case 'residente': roleActiveStatus = 'registered'; break;
    case 'superintendente': roleActiveStatus = 'auth_resident'; break;
    case 'lider_proyecto': roleActiveStatus = 'auth_super'; break;
    case 'compras': roleActiveStatus = 'auth_leader'; break;
    case 'finanzas': roleActiveStatus = 'factura_subida'; break;
    case 'pagos': roleActiveStatus = 'validated_finanzas'; break;
    case 'contratista': roleActiveStatus = 'validated_compras'; break;
    default: return estimations; // Soporte sees all
  }

  // Filter: Show if current status is >= role's active status
  return estimations.filter(est => {
     const currentStatusIndex = statusOrder[est.status] || 0;
     const roleActiveIndex = statusOrder[roleActiveStatus];

     if (roleActiveIndex === undefined) return true;
     return currentStatusIndex >= roleActiveIndex;
  });
};

export default function Aprobaciones() {
  const { currentRole, costCenters, contracts } = useEstimationStore();
  const { currentProjectId } = useProject();
  const { estimations: dbEstimations, loading, error, refetch } = useProjectEstimations(currentProjectId);
  
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);

  // Map DB estimations to frontend format
  const estimations = dbEstimations.map(est => mapDbEstimationToFrontend(est as any));
  const filteredEstimations = getFilteredEstimations(estimations, currentRole);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bandeja de Aprobaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las estimaciones pendientes según tu rol actual
          </p>
        </div>
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Selecciona un proyecto para ver las aprobaciones pendientes</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bandeja de Aprobaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las estimaciones pendientes según tu rol actual
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Cargando estimaciones...</p>
        </Card>
      ) : error ? (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </Card>
      ) : filteredEstimations.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay estimaciones pendientes</h3>
          <p className="text-muted-foreground">
            No tienes estimaciones pendientes de aprobación en este momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEstimations.map((estimation) => {
            const costCenter = costCenters.find(cc => cc.id === estimation.costCenterId);
            const contract = contracts.find(c => c.id === estimation.contractId);
            const config = statusConfig[estimation.status];

            return (
              <Card
                key={estimation.id}
                className="p-6 bg-card border border-border rounded-xl hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedEstimation(estimation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-foreground">{costCenter?.name || 'Proyecto'}</h3>
                        <Badge className={`${config.badge} border-0 text-xs font-semibold uppercase tracking-wide px-3 py-1`}>
                          {config.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3">
                        <div>
                          <span className="font-medium">Folio:</span> {estimation.folio}
                        </div>
                        <div>
                          <span className="font-medium">Proyecto:</span> {estimation.projectNumber}
                        </div>
                        <div>
                          <span className="font-medium">Contrato:</span> {contract?.name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Monto:</span> {formatCurrency(estimation.amount)}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Contratista:</span> {estimation.contractorName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEstimation(estimation);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Detalle
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedEstimation && (
        <EstimationDetailModal
          estimation={selectedEstimation}
          projectId={currentProjectId}
          onClose={() => setSelectedEstimation(null)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
