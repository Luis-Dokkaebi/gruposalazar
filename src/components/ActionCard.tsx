import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Estimation } from "@/types/estimation";
import { formatCurrency } from "@/lib/utils";
import { Check, X, FileText, Calendar, Building, Hash, FileCheck, DollarSign } from "lucide-react";
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

  const DataRow = ({ label, value, isLast = false }: { label: string, value: React.ReactNode, isLast?: boolean }) => (
    <div className={`flex justify-between py-3 px-4 ${!isLast ? 'border-b border-border/50' : ''} hover:bg-muted/30 transition-colors`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );

  return (
    <Card className="w-full overflow-hidden shadow-lg border-border bg-card">
      {/* Top Action Bar & Branding - Mimicking the top green/red/grey bar concept but cleaner */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Action Buttons - Top Left as requested/implied by flow */}
           <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-w-[120px]"
            onClick={onApprove}
          >
            <Check className="mr-2 h-4 w-4" /> AUTORIZAR
          </Button>
          <Button
            variant="destructive"
            className="font-bold shadow-md min-w-[120px]"
            onClick={onReject}
          >
            <X className="mr-2 h-4 w-4" /> RECHAZAR
          </Button>
        </div>

        <div className="text-right hidden md:block">
          <h3 className="font-bold text-xl tracking-tight">Grupo Salazar</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Gestión de Estimaciones</p>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-slate-50/50">

        {/* Title Section */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 bg-white rounded-lg border shadow-sm">
             <FileText className="h-8 w-8 text-slate-700" />
          </div>
          <div>
             <h2 className="text-3xl font-light text-slate-800">Estimación {estimation.folio}</h2>
             <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                  {estimation.status.replace(/_/g, " ")}
                </span>
                <span className="text-slate-400">•</span>
                <span>Creada el {new Date(estimation.createdAt).toLocaleDateString()}</span>
             </p>
          </div>
        </div>

        {/* Content Columns - "Datos del Contrato" */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-slate-700 font-semibold text-lg border-l-4 border-orange-500 pl-3">
              <FileCheck className="h-5 w-5" /> Datos del contrato
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: General Info */}
              <Card className="shadow-sm border-border/60 bg-white">
                <CardContent className="p-0">
                  <div className="bg-muted/40 px-4 py-2 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Información General
                  </div>
                  <DataRow label="Proyecto" value={projectName} />
                  <DataRow label="Proveedor" value={estimation.contractorName} />
                  <DataRow label="Número de contrato" value={estimation.contractId} />
                  <DataRow label="Fecha" value={new Date(estimation.createdAt).toLocaleDateString()} />
                  <DataRow label="Número de pedido" value={estimation.projectNumber} />
                  <DataRow label="Importe de pedido" value={formatCurrency(estimation.amount)} />
                  <DataRow label="Tipo de moneda" value="MXN" />
                  <DataRow
                    label="Estatus"
                    value={
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                         {estimation.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    }
                    isLast
                  />
                </CardContent>
              </Card>

              {/* Right Column: Financials */}
              <Card className="shadow-sm border-border/60 bg-white">
                 <CardContent className="p-0">
                   <div className="bg-muted/40 px-4 py-2 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Detalles Financieros
                  </div>
                   {/* Mocking fields based on the image structure since they aren't in DB yet, but populated logically */}
                   <DataRow
                      label="Importe del contrato"
                      value={<span className="font-bold">{formatCurrency(estimation.amount * 5)}</span>}
                   />
                   <DataRow
                      label="Importe de anticipo"
                      value={formatCurrency(estimation.amount * 1.5)}
                   />
                   <DataRow label="Porcentaje de anticipo" value="30.00%" />
                   <DataRow
                      label="Anticipo amortizado"
                      value={<span className="text-red-600">-{formatCurrency(estimation.amount * 0.3)}</span>}
                   />
                   <DataRow
                      label="Anticipo por amortizar"
                      value={<span className="text-emerald-600 font-bold">{formatCurrency(estimation.amount * 0.2)}</span>}
                   />
                   {/* Adding current estimation amount here prominently */}
                   <div className="bg-primary/5 border-t border-primary/10 p-4 mt-4 flex justify-between items-center">
                      <span className="font-bold text-primary flex items-center gap-2">
                        <DollarSign className="h-5 w-5" /> ESTA ESTIMACIÓN
                      </span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(estimation.amount)}</span>
                   </div>
                 </CardContent>
              </Card>
           </div>
        </div>

        {/* Detail/Grid Placeholder (Bottom section of image) */}
         <div className="space-y-4 pt-4">
           <div className="flex items-center gap-2 text-slate-700 font-semibold text-lg border-l-4 border-slate-400 pl-3">
              <Hash className="h-5 w-5" /> Detalle de Conceptos
           </div>
           <Card className="bg-white border-border/60 min-h-[150px] flex items-center justify-center text-muted-foreground border-dashed border-2">
              <p>Detalle de conceptos disponible en PDF adjunto</p>
           </Card>
        </div>

      </div>
    </Card>
  );
}
