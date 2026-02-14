import { useState } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { useProjectData } from "@/hooks/useProjectData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import { Estimation, UserRole } from "@/types/estimation";
import { AppRole } from "@/types/collaborator";

interface BaseOperationalDashboardProps {
  role: AppRole;
  title: string;
}

const statusConfig: Record<string, { label: string; variant: string; badge: string }> = {
  registered: { label: "Pendiente Residente", variant: "warning", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  auth_resident: { label: "Pendiente Superintendente", variant: "default", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  auth_super: { label: "Pendiente Líder", variant: "default", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  auth_leader: { label: "Pendiente Compras", variant: "default", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  validated_compras: { label: "Validado - Pendiente Factura", variant: "success", badge: "bg-green-100 text-green-700 border-green-200" },
  factura_subida: { label: "Factura Subida - Pendiente Finanzas", variant: "default", badge: "bg-teal-100 text-teal-700 border-teal-200" },
  validated_finanzas: { label: "Pendiente Pago", variant: "default", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  paid: { label: "Pagado", variant: "success", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const getFilteredEstimations = (estimations: Estimation[], role: AppRole): Estimation[] => {
  // Casting AppRole to UserRole where they match is safe, but we handle the mismatch.
  // The logic in Aprobaciones.tsx matches strings.

  switch (role) {
    case "residente":
      return estimations.filter(e => e.status === "registered");
    case "superintendente":
      return estimations.filter(e => e.status === "auth_resident");
    case "lider_proyecto":
      return estimations.filter(e => e.status === "auth_super");
    case "compras":
      return estimations.filter(e => e.status === "auth_leader");
    case "finanzas":
      return estimations.filter(e => e.status === "factura_subida");
    case "pagos":
      return estimations.filter(e => e.status === "validated_finanzas");
    default:
      return [];
  }
};

export function BaseOperationalDashboard({ role, title }: BaseOperationalDashboardProps) {
  const { currentProjectId, currentProject } = useProject();
  const { estimations: dbEstimations, loading, error, refetch } = useProjectEstimations(currentProjectId);
  const { contracts, costCenters } = useProjectData(currentProjectId);
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);

  // Map DB estimations to frontend format
  const estimations = dbEstimations.map(est => mapDbEstimationToFrontend(est as any));

  // Strict segregation: Only show what is pending for this role
  const filteredEstimations = getFilteredEstimations(estimations, role);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!currentProjectId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between border-b pb-4">
             <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        </div>
        <Card className="p-12 text-center border-dashed border-2 bg-slate-50">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No hay un proyecto seleccionado.</p>
          <p className="text-sm text-slate-400 mt-2">Contacta a soporte si crees que esto es un error.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500 mt-1">
                Proyecto: <span className="font-semibold text-slate-700">{currentProject?.name}</span>
            </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-slate-500">Cargando estimaciones...</p>
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
        </Card>
      ) : filteredEstimations.length === 0 ? (
        <Card className="p-16 text-center border-slate-200 shadow-sm bg-white">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <FileText className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Todo al día</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            No tienes estimaciones pendientes de revisión o autorización en este momento.
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
                className="group relative overflow-hidden bg-white border-slate-200 hover:border-blue-500/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedEstimation(estimation)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                         <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                                 <FileText className="h-6 w-6 text-slate-600 group-hover:text-blue-600" />
                             </div>
                             <div>
                                 <h3 className="font-bold text-lg text-slate-900">{costCenter?.name || 'Estimación sin CC'}</h3>
                                 <p className="text-sm text-slate-500">Folio: {estimation.folio}</p>
                             </div>
                         </div>
                         <Badge className={`${config.badge} px-3 py-1`}>
                           {config.label}
                         </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                        <div>
                             <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Contratista</p>
                             <p className="font-medium text-slate-700 truncate">{estimation.contractorName}</p>
                        </div>
                        <div>
                             <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Contrato</p>
                             <p className="font-medium text-slate-700 truncate">{contract?.name || 'N/A'}</p>
                        </div>
                        <div>
                             <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Proyecto</p>
                             <p className="font-medium text-slate-700">{estimation.projectNumber}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-slate-400 text-xs uppercase font-semibold mb-1">Monto Total</p>
                             <p className="font-bold text-slate-900 text-lg">{formatCurrency(estimation.amount)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium">
                        Ver Detalle <Eye className="ml-2 h-4 w-4" />
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
