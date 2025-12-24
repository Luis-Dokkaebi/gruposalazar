import { useEstimationStore } from "@/lib/estimationStore";
import { EstimationCard } from "@/components/EstimationCard";
import { Card } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { EmailModal } from "@/components/EmailModal";
import { Button } from "@/components/ui/button";
import { UserManagement } from "@/components/UserManagement";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

export default function Dashboard() {
  const { currentRole, estimations, emailNotifications } = useEstimationStore();
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const navigate = useNavigate();

  // STRICT FILTERING: Only show what's in user's "cancha" (pending work)
  const getRelevantEstimations = () => {
    if (currentRole === 'contratista') {
      return estimations; // Contratista sees all their estimations
    }
    
    // Soporte Técnico sees everything
    if (currentRole === 'soporte_tecnico') {
      return estimations;
    }

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
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Bienvenido al sistema de gestión de estimaciones de obra"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Dashboard" },
        ]}
      />

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
        <h2 className="text-2xl font-bold text-foreground mb-4">Mis Estimaciones Recientes</h2>
        {relevantEstimations.length === 0 ? (
          <Card className="p-12 text-center border border-border rounded-xl bg-card">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">No hay estimaciones pendientes</p>
            <Button 
              onClick={() => navigate('/estimaciones')}
              className="bg-primary hover:bg-primary/90"
            >
              Crear nueva estimación
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {relevantEstimations.slice(0, 4).map((estimation) => (
              <EstimationCard
                key={estimation.id}
                estimation={estimation}
                onClick={currentRole === 'soporte_tecnico' ? () => navigate('/estimaciones') : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      {currentRole === 'soporte_tecnico' && <UserManagement />}
    </div>
  );
}
