import { useEstimationStore } from "@/lib/estimationStore";
import { EstimationCard } from "@/components/EstimationCard";
import { ProjectConfig } from "@/components/ProjectConfig";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
import { Card } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { EmailModal } from "@/components/EmailModal";
import { Button } from "@/components/ui/button";
import { Estimation } from "@/types/estimation";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";

export default function Dashboard() {
  const { currentRole, estimations, emailNotifications } = useEstimationStore();
  const { currentProjectId } = useProject();
  const { refetch } = useProjectEstimations(currentProjectId);
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);

  // Show what's in user's "cancha" (pending work) AND historical items (read-only)
  const getRelevantEstimations = () => {
    if (currentRole === 'contratista') {
      return estimations; // Contratista sees all their estimations
    }
    
    // Define the sequence order of statuses
    const statusOrder: Record<string, number> = {
      'submitted': -1,
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
    switch (currentRole) {
      case 'soporte': return estimations; // Soporte sees everything
      case 'residente': roleActiveStatus = 'registered'; break;
      case 'superintendente': roleActiveStatus = 'auth_resident'; break;
      case 'lider_proyecto': roleActiveStatus = 'auth_super'; break;
      case 'compras': roleActiveStatus = 'auth_leader'; break;
      case 'finanzas': roleActiveStatus = 'factura_subida'; break;
      case 'pagos': roleActiveStatus = 'validated_finanzas'; break;
    }

    // Filter logic:
    // 1. Show if it's currently in my active status (Pending)
    // 2. Show if the status is PAST my active status (Read Only / History)
    //    This handles the "re-integration" requirement: if a user was skipped,
    //    the status will be ahead of their active status, so they should see it.

    return estimations.filter(est => {
       const currentStatusIndex = statusOrder[est.status] || 0;
       const roleActiveIndex = statusOrder[roleActiveStatus];

       // If role is unknown (e.g. soporte), maybe show all?
       if (roleActiveIndex === undefined) return false;

       // Show if current status is equal or greater than the role's "trigger" status
       // e.g. Resident (trigger index 0):
       //   - registered (0) -> Show (Pending)
       //   - auth_resident (1) -> Show (Read Only - Approved)
       //   - auth_super (2) -> Show (Read Only - Approved/Skipped)
       return currentStatusIndex >= roleActiveIndex;
    });
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
      value: relevantEstimations.length,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning",
      hoverBg: "hover:bg-warning/5",
    },
    {
      title: "Completadas",
      value: estimations.filter(e => e.status === "paid").length,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success",
      hoverBg: "hover:bg-success/5",
    },
    {
      title: "En Proceso",
      value: estimations.filter(e => 
        e.status !== "paid" && e.status !== "registered"
      ).length,
      icon: AlertCircle,
      color: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info",
      hoverBg: "hover:bg-info/5",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {currentRole === 'soporte' ? 'Panel de Soporte Técnico' : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {currentRole === 'soporte'
            ? 'Configuración y gestión de estimaciones'
            : 'Bienvenido al sistema de gestión de estimaciones de obra'}
        </p>
      </div>

      {currentRole === 'soporte' && <ProjectConfig />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className={`p-6 border-l-4 ${stat.borderColor} ${stat.hoverBg} transition-colors bg-card rounded-xl`}>
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
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {currentRole === 'soporte' ? 'Todas las Estimaciones' : 'Mis Estimaciones Recientes'}
        </h2>
        {relevantEstimations.length === 0 ? (
          <Card className="p-12 text-center border border-border rounded-xl bg-card">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">No hay estimaciones pendientes</p>
            <Button 
              onClick={() => window.location.href = '/estimaciones'}
              className="bg-primary hover:bg-primary/90"
            >
              Crear nueva estimación
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {relevantEstimations.map((estimation) => (
              <EstimationCard
                key={estimation.id}
                estimation={estimation}
                onClick={() => setSelectedEstimation(estimation)}
              />
            ))}
          </div>
        )}
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

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
