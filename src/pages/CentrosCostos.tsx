import { useEstimationStore } from "@/lib/estimationStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const statusColors = {
  inicio: { 
    bg: "bg-warning/10", 
    text: "text-warning-foreground", 
    label: "Inicio",
    badge: "bg-amber-100 text-amber-700"
  },
  proceso: { 
    bg: "bg-primary/10", 
    text: "text-primary", 
    label: "En Proceso",
    badge: "bg-blue-100 text-blue-700"
  },
  cierre: { 
    bg: "bg-success/10", 
    text: "text-success", 
    label: "Cierre",
    badge: "bg-emerald-100 text-emerald-700"
  },
};

export default function CentrosCostos() {
  const { costCenters } = useEstimationStore();

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
        <h1 className="text-3xl font-bold text-foreground">Centros de Costos</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de proyectos y centros de costos activos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {costCenters.map((center) => {
          const statusConfig = statusColors[center.status];
          return (
            <Card 
              key={center.id} 
              className="p-6 bg-card border border-border rounded-xl hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60">{center.id}</span>
                </div>
                <Badge className={`${statusConfig.badge} border-0 text-xs font-semibold uppercase tracking-wide px-3 py-1`}>
                  {statusConfig.label}
                </Badge>
              </div>
              
              <h3 className="text-lg font-bold text-foreground mt-4">{center.name}</h3>
              
              <div className="mt-6 space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${center.progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Presupuesto: {formatCurrency(center.budget)}</span>
                  <span className="font-semibold">Avance: {center.progress}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
