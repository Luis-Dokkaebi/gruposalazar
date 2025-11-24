import { useEstimationStore } from "@/lib/estimationStore";
import { EstimationCard } from "@/components/EstimationCard";
import { Card } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { EmailModal } from "@/components/EmailModal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Dashboard() {
  const { currentRole, estimations, updateEstimationStatus, emailNotifications } = useEstimationStore();
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEstimationId, setSelectedEstimationId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter estimations based on current role
  const getRelevantEstimations = () => {
    switch (currentRole) {
      case "residente":
        return estimations.filter(e => e.status === "pendiente_residente");
      case "superintendente":
        return estimations.filter(e => e.status === "pendiente_superintendente");
      case "lider_proyecto":
        return estimations.filter(e => e.status === "pendiente_lider");
      case "compras":
        return estimations.filter(e => 
          e.status === "pendiente_compras" || 
          e.status === "programado_pago"
        );
      case "contabilidad":
        return estimations.filter(e => e.status === "programado_pago");
      case "almacen":
        return estimations.filter(e => e.status === "pago_realizado");
      default:
        return estimations;
    }
  };

  const handleApprove = (estimationId: string) => {
    const estimation = estimations.find(e => e.id === estimationId);
    if (!estimation) return;

    let newStatus: typeof estimation.status;
    
    switch (currentRole) {
      case "residente":
        newStatus = "pendiente_superintendente";
        break;
      case "superintendente":
        newStatus = "pendiente_lider";
        break;
      case "lider_proyecto":
        newStatus = "pendiente_compras";
        break;
      case "compras":
        newStatus = estimation.status === "pendiente_compras" ? "programado_pago" : estimation.status;
        break;
      case "contabilidad":
        newStatus = "pago_realizado";
        break;
      case "almacen":
        newStatus = "material_recibido";
        break;
      default:
        return;
    }

    updateEstimationStatus(estimationId, newStatus);
    toast.success("Estimación aprobada correctamente");
    
    // Show email notification
    setTimeout(() => {
      const latestNotification = emailNotifications[0];
      if (latestNotification) {
        setSelectedNotification(latestNotification);
      }
    }, 500);
  };

  const handleReject = (estimationId: string) => {
    setSelectedEstimationId(estimationId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!selectedEstimationId) return;

    const estimation = estimations.find(e => e.id === selectedEstimationId);
    if (!estimation) return;

    let newStatus: typeof estimation.status;
    
    switch (currentRole) {
      case "residente":
        newStatus = "rechazado_residente";
        break;
      case "superintendente":
        newStatus = "rechazado_superintendente";
        break;
      case "lider_proyecto":
        newStatus = "rechazado_lider";
        break;
      default:
        return;
    }

    updateEstimationStatus(selectedEstimationId, newStatus, rejectionReason);
    toast.error("Estimación rechazada");
    setRejectDialogOpen(false);
    setRejectionReason("");
    setSelectedEstimationId(null);

    setTimeout(() => {
      const latestNotification = emailNotifications[0];
      if (latestNotification) {
        setSelectedNotification(latestNotification);
      }
    }, 500);
  };

  const relevantEstimations = getRelevantEstimations();

  const stats = [
    {
      title: "Total Estimaciones",
      value: estimations.length,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary",
      hoverBg: "hover:bg-primary/5",
    },
    {
      title: "Pendientes",
      value: relevantEstimations.filter(e => e.status.includes("pendiente")).length,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning",
      hoverBg: "hover:bg-warning/5",
    },
    {
      title: "Aprobadas",
      value: estimations.filter(e => 
        e.status === "pago_realizado" || 
        e.status === "material_recibido"
      ).length,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success",
      hoverBg: "hover:bg-success/5",
    },
    {
      title: "Rechazadas",
      value: estimations.filter(e => e.status.includes("rechazado")).length,
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive",
      hoverBg: "hover:bg-destructive/5",
    },
  ];

  const showActions = ["residente", "superintendente", "lider_proyecto"].includes(currentRole);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido al sistema de gestión de estimaciones de obra
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className={`p-6 border-l-4 ${stat.borderColor} ${stat.hoverBg} transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Estimaciones Pendientes</h2>
        {relevantEstimations.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-xl bg-transparent">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">No hay estimaciones pendientes</p>
            <Button 
              onClick={() => window.location.href = '/estimaciones'}
              className="bg-primary hover:bg-primary/90"
            >
              Crear nueva estimación
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {relevantEstimations.map((estimation) => (
              <EstimationCard
                key={estimation.id}
                estimation={estimation}
                onApprove={() => handleApprove(estimation.id)}
                onReject={() => handleReject(estimation.id)}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rechazar Estimación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Por favor, proporciona una razón para rechazar esta estimación:
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Escribe la razón del rechazo..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!rejectionReason.trim()}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
