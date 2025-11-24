import { useEstimationStore } from "@/lib/estimationStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const statusColors = {
  inicio: { bg: "bg-warning/10", text: "text-warning", label: "Inicio" },
  proceso: { bg: "bg-primary/10", text: "text-primary", label: "En Proceso" },
  cierre: { bg: "bg-success/10", text: "text-success", label: "Cierre" },
};

export default function CentrosCostos() {
  const { costCenters } = useEstimationStore();

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
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{center.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">ID: {center.id}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
