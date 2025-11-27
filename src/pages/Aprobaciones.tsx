import { useState } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
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
    case "contratista":
      return estimations.filter(e => e.status === "validated_compras");
    default:
      return estimations;
  }
};

export default function Aprobaciones() {
  const { estimations, currentRole, costCenters, contracts } = useEstimationStore();
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);

  const filteredEstimations = getFilteredEstimations(estimations, currentRole);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bandeja de Aprobaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las estimaciones pendientes según tu rol actual
        </p>
      </div>

      {filteredEstimations.length === 0 ? (
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
          onClose={() => setSelectedEstimation(null)}
        />
      )}
    </div>
  );
}
