import { useEstimationStore } from "@/lib/estimationStore";
import { ActionCard } from "@/components/ActionCard";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { EstimationStatus } from "@/types/estimation";

export function OperationalDashboard() {
  const { currentRole, estimations, updateEstimationStatus } = useEstimationStore();

  const getRelevantEstimations = () => {
    return estimations.filter(est => {
      switch (currentRole) {
        case 'residente':
          return est.status === 'registered';
        case 'superintendente':
          return est.status === 'auth_resident';
        case 'lider_proyecto':
          return est.status === 'auth_super';
        case 'compras':
          return est.status === 'auth_leader';
        case 'finanzas':
          return est.status === 'factura_subida';
        case 'pagos':
          return est.status === 'validated_finanzas';
        default:
          return false;
      }
    });
  };

  const relevantEstimations = getRelevantEstimations();

  const handleApprove = (id: string) => {
    let nextStatus: EstimationStatus | null = null;
    let successMessage = "Estimación autorizada correctamente";

    switch (currentRole) {
      case 'residente':
        nextStatus = 'auth_resident';
        break;
      case 'superintendente':
        nextStatus = 'auth_super';
        break;
      case 'lider_proyecto':
        nextStatus = 'auth_leader';
        break;
      case 'compras':
        nextStatus = 'validated_compras';
        successMessage = "Estimación validada y OC generada";
        break;
      case 'finanzas':
        nextStatus = 'validated_finanzas';
        successMessage = "Factura validada para pago";
        break;
      case 'pagos':
        nextStatus = 'paid';
        successMessage = "Pago registrado exitosamente";
        break;
    }

    if (nextStatus) {
      updateEstimationStatus(id, nextStatus);
      toast.success(successMessage);
    }
  };

  const handleReject = (id: string) => {
    // For now, rejection might just imply sending it back or logging.
    // The prompt only asked for buttons to emit events.
    // Usually rejection sends it back to 'registered' or previous step.
    // I'll simulate a rejection toast for now as logic wasn't fully specified beyond "emit event".
    // But to be helpful, I'll log it.
    toast.error("Funcionalidad de rechazo pendiente de definir flujo exacto");
    console.log(`Rejected estimation ${id} by ${currentRole}`);
  };

  const roleTitles: Record<string, string> = {
    'residente': 'Panel de Residente',
    'superintendente': 'Panel de Superintendente',
    'lider_proyecto': 'Panel de Líder de Proyecto',
    'compras': 'Panel de Compras',
    'finanzas': 'Panel de Finanzas',
    'pagos': 'Panel de Pagos'
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={roleTitles[currentRole] || "Dashboard Operativo"}
        subtitle="Gestione las estimaciones pendientes de su área"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Dashboard" },
        ]}
      />

      {relevantEstimations.length === 0 ? (
        <Card className="p-12 text-center border border-border rounded-xl bg-card flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2">¡Todo al día!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            No tienes estimaciones pendientes de revisar en este momento.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {relevantEstimations.map((estimation) => (
            <ActionCard
              key={estimation.id}
              estimation={estimation}
              onApprove={() => handleApprove(estimation.id)}
              onReject={() => handleReject(estimation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
