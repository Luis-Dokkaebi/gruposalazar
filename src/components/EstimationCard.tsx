import { Estimation } from "@/types/estimation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EstimationCardProps {
  estimation: Estimation;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

const statusLabels: Record<Estimation['status'], { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
  registered: { label: 'Registrada', variant: 'warning' },
  auth_resident: { label: 'Autorizada - Residente', variant: 'default' },
  auth_super: { label: 'Autorizada - Superintendente', variant: 'default' },
  auth_leader: { label: 'Autorizada - Líder', variant: 'default' },
  validated_compras: { label: 'Validada - Compras', variant: 'success' },
  factura_subida: { label: 'Factura Subida', variant: 'default' },
  validated_finanzas: { label: 'Validada - Finanzas', variant: 'success' },
  paid: { label: 'Pagado', variant: 'success' },
};

export function EstimationCard({ estimation, onApprove, onReject, showActions }: EstimationCardProps) {
  const statusInfo = statusLabels[estimation.status];

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Folio: {estimation.folio}</h3>
            <p className="text-sm text-muted-foreground">Proyecto #{estimation.projectNumber}</p>
          </div>
        </div>
        <Badge variant={statusInfo.variant === 'warning' ? 'default' : statusInfo.variant}>
          {statusInfo.label}
        </Badge>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(estimation.createdAt, "d 'de' MMMM, yyyy", { locale: es })}</span>
        </div>
        <p className="text-foreground"><span className="font-medium">Contratista:</span> {estimation.contractorName}</p>
        <p className="text-foreground"><span className="font-medium">Descripción:</span> {estimation.estimationText}</p>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={onApprove} 
            className="flex-1 bg-success hover:bg-success/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar
          </Button>
          <Button 
            onClick={onReject} 
            variant="destructive" 
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rechazar
          </Button>
        </div>
      )}
    </Card>
  );
}
