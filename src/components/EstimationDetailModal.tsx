import { useState } from "react";
import { Estimation, UserRole } from "@/types/estimation";
import { useEstimationStore } from "@/lib/estimationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface EstimationDetailModalProps {
  estimation: Estimation;
  onClose: () => void;
}

const statusSteps = [
  { key: "registered", label: "Registrada", step: 1 },
  { key: "auth_resident", label: "Residente", step: 2 },
  { key: "auth_super", label: "Superintendente", step: 3 },
  { key: "auth_leader", label: "Líder", step: 4 },
  { key: "validated_compras", label: "Compras", step: 5 },
  { key: "validated_finanzas", label: "Finanzas", step: 6 },
  { key: "paid", label: "Pagado", step: 7 },
];

export function EstimationDetailModal({ estimation, onClose }: EstimationDetailModalProps) {
  const { currentRole, updateEstimationStatus, costCenters, contracts } = useEstimationStore();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const costCenter = costCenters.find(cc => cc.id === estimation.costCenterId);
  const contract = contracts.find(c => c.id === estimation.contractId);

  const currentStepIndex = statusSteps.findIndex(s => s.key === estimation.status);
  const progressPercentage = ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getWatermarkConfig = () => {
    if (estimation.status === "paid") {
      return { text: "PAGADO", color: "text-emerald-500/30", bgColor: "bg-emerald-500/5" };
    } else if (estimation.status === "validated_compras" || estimation.status === "validated_finanzas") {
      return { text: "VÁLIDO PARA FACTURAR", color: "text-green-500/30", bgColor: "bg-green-500/5" };
    } else {
      return { text: "NO VÁLIDO PARA FACTURA", color: "text-red-500/30", bgColor: "bg-red-500/5" };
    }
  };

  const watermark = getWatermarkConfig();

  const handleAction = () => {
    switch (currentRole) {
      case "residente":
        if (estimation.status === "registered") {
          updateEstimationStatus(estimation.id, "auth_resident");
          toast.success("Estimación autorizada por Residente");
          onClose();
        }
        break;
      case "superintendente":
        if (estimation.status === "auth_resident") {
          updateEstimationStatus(estimation.id, "auth_super");
          toast.success("Notificación enviada a Líder y copia a Juany");
          onClose();
        }
        break;
      case "lider_proyecto":
        if (estimation.status === "auth_super") {
          updateEstimationStatus(estimation.id, "auth_leader");
          toast.success("Visto Bueno otorgado por Líder");
          onClose();
        }
        break;
      case "compras":
        if (estimation.status === "auth_leader") {
          updateEstimationStatus(estimation.id, "validated_compras");
          toast.success("OC Generada - Estimación VÁLIDA PARA FACTURAR");
          onClose();
        }
        break;
      case "finanzas":
        if (estimation.status === "validated_compras" && estimation.invoiceUrl) {
          updateEstimationStatus(estimation.id, "validated_finanzas");
          toast.success("Factura validada - Liberado para pago");
          onClose();
        }
        break;
      case "pagos":
        if (estimation.status === "validated_finanzas") {
          updateEstimationStatus(estimation.id, "paid");
          toast.success("Transferencia confirmada - Pago realizado");
          onClose();
        }
        break;
    }
  };

  const handleInvoiceUpload = () => {
    if (invoiceFile) {
      // Simulate upload
      toast.success("Factura cargada exitosamente");
      onClose();
    }
  };

  const getActionButton = () => {
    if (currentRole === "contratista" && estimation.status === "validated_compras") {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoice">Subir Factura (XML/PDF)</Label>
            <Input
              id="invoice"
              type="file"
              accept=".xml,.pdf"
              onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleInvoiceUpload}
            disabled={!invoiceFile}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir Factura
          </Button>
        </div>
      );
    }

    const actionMap: Record<UserRole, { label: string; canAct: boolean }> = {
      residente: { label: "Autorizar Avance", canAct: estimation.status === "registered" },
      superintendente: { label: "Autorizar Técnica", canAct: estimation.status === "auth_resident" },
      lider_proyecto: { label: "Dar Visto Bueno", canAct: estimation.status === "auth_super" },
      compras: { label: "Generar OC y Validar", canAct: estimation.status === "auth_leader" },
      finanzas: { label: "Liberar para Pago", canAct: estimation.status === "validated_compras" && !!estimation.invoiceUrl },
      pagos: { label: "Confirmar Transferencia", canAct: estimation.status === "validated_finanzas" },
      contratista: { label: "", canAct: false },
    };

    const action = actionMap[currentRole];
    
    if (!action.canAct) return null;

    return (
      <Button onClick={handleAction} className="w-full">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Detalle de Estimación</DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Watermark */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${watermark.bgColor}`}>
            <div
              className={`${watermark.color} font-black text-7xl transform -rotate-45 select-none`}
              style={{ letterSpacing: '0.1em' }}
            >
              {watermark.text}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-20 space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Folio</p>
                <p className="font-bold text-lg">{estimation.folio}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proyecto</p>
                <p className="font-bold text-lg">{estimation.projectNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Centro de Costos</p>
                <p className="font-semibold">{costCenter?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contrato</p>
                <p className="font-semibold">{contract?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contratista</p>
                <p className="font-semibold">{estimation.contractorName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(estimation.amount)}</p>
              </div>
            </div>

            {/* Timeline Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Progreso del Flujo</h3>
                <Badge variant="outline" className="text-sm">
                  Paso {currentStepIndex + 1} de {statusSteps.length}
                </Badge>
              </div>
              
              <Progress value={progressPercentage} className="h-3" />
              
              <div className="grid grid-cols-7 gap-2">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div
                      key={step.key}
                      className={`text-center p-2 rounded-lg border-2 transition-all ${
                        isCompleted
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/30'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                      <div className="text-xs font-semibold mb-1">Paso {step.step}</div>
                      <div className="text-xs text-muted-foreground">{step.label}</div>
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 mx-auto mt-1 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descripción
              </h4>
              <p className="text-sm text-muted-foreground">{estimation.estimationText}</p>
            </div>

            {/* Action Button */}
            {getActionButton()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
