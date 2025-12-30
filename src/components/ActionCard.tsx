import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Estimation } from "@/types/estimation";
import { formatCurrency } from "@/lib/utils";
import { Check, X, FileText, Calendar, Building, Hash } from "lucide-react";
import { useEstimationStore } from "@/lib/estimationStore";

interface ActionCardProps {
  estimation: Estimation;
  onApprove: () => void;
  onReject: () => void;
}

export function ActionCard({ estimation, onApprove, onReject }: ActionCardProps) {
  const { costCenters } = useEstimationStore();
  const costCenter = costCenters.find(cc => cc.id === estimation.costCenterId);
  const projectName = costCenter?.name || "Proyecto sin nombre";

  return (
    <Card className="w-full overflow-hidden shadow-xl border-border bg-card">
      {/* Branding Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Grupo Salazar</h3>
          <p className="text-xs text-slate-400">Sistema de Estimaciones</p>
        </div>
        <Badge variant="outline" className="text-white border-white/20 bg-white/10">
          {estimation.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xl">
          <FileText className="h-5 w-5" />
          Estimación {estimation.folio}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Blocks - replicating the "divisions" idea */}
        <div className="grid grid-cols-1 gap-4 text-sm">

          {/* Project Block */}
          <div className="bg-muted/50 p-3 rounded-md border border-border/50">
            <div className="text-muted-foreground text-xs font-medium uppercase mb-1 flex items-center gap-1">
              <Building className="h-3 w-3" /> Proyecto
            </div>
            <div className="font-semibold text-foreground truncate" title={projectName}>
              {projectName}
            </div>
          </div>

          {/* Provider Block */}
          <div className="bg-muted/50 p-3 rounded-md border border-border/50">
             <div className="text-muted-foreground text-xs font-medium uppercase mb-1 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Proveedor
            </div>
            <div className="font-semibold text-foreground truncate" title={estimation.contractorName}>
              {estimation.contractorName}
            </div>
             <div className="mt-2 flex justify-between items-center border-t border-border/50 pt-2">
                <div>
                   <span className="text-muted-foreground text-xs block">Pedido</span>
                   <span className="font-medium">{estimation.projectNumber}</span>
                </div>
                 <div className="text-right">
                   <span className="text-muted-foreground text-xs block">Fecha</span>
                   <span className="font-medium flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                     {new Date(estimation.createdAt).toLocaleDateString()}
                   </span>
                </div>
             </div>
          </div>

          {/* Amount Block - Highlighted */}
          <div className="bg-primary/5 p-4 rounded-md border border-primary/20 flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Monto Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(estimation.amount)}
            </span>
          </div>

        </div>
      </CardContent>

      <CardFooter className="flex gap-3 pt-2 pb-6 px-6">
        <Button
          variant="destructive"
          className="flex-1 font-semibold h-12 shadow-sm"
          onClick={onReject}
        >
          <X className="mr-2 h-5 w-5" /> RECHAZAR
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 shadow-sm"
          onClick={onApprove}
        >
          <Check className="mr-2 h-5 w-5" /> AUTORIZAR
        </Button>
      </CardFooter>
    </Card>
  );
}
