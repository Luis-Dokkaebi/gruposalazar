import { useEstimationStore } from "@/lib/estimationStore";
import { ActionCard } from "@/components/ActionCard";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
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
        /* Changed to single column stack to allow full width cards */
        <div className="flex flex-col gap-12 pb-12">
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
