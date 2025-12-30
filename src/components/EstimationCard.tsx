import { Estimation, Contract, CostCenter } from "@/types/estimation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, FileText, Calendar, Hash, FileCheck, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EstimationCardProps {
  estimation: Estimation;
  contract?: Contract;
  costCenter?: CostCenter;
  onApprove?: () => void;
  onReject?: () => void;
  onClick?: () => void;
  showActions?: boolean;
}

export function EstimationCard({
  estimation,
  contract,
  costCenter,
  onApprove,
  onReject,
  onClick,
  showActions
}: EstimationCardProps) {

  const projectName = costCenter?.name || "Proyecto no asignado";

  // Calculate contract amount if available, otherwise mock/fallback
  const contractAmount = contract?.concepts?.reduce((acc, concept) => {
    return acc + (concept.unitPrice * concept.quantity);
  }, 0) || (estimation.amount * 5); // Fallback to mock if no contract data

  const advanceAmount = contractAmount * 0.30; // Assuming 30% advance
  const amortizedAmount = estimation.amount * 0.30; // 30% of current estimation
  const pendingAmortization = advanceAmount - amortizedAmount; // Simple mock logic

  const DataRow = ({ label, value, isLast = false }: { label: string, value: React.ReactNode, isLast?: boolean }) => (
    <div className={`flex justify-between py-3 px-4 ${!isLast ? 'border-b border-border/50' : ''} hover:bg-muted/30 transition-colors`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );

  const formatStatus = (status: string) => {
    switch (status) {
      case 'registered': return 'Pre-Estimación (Residente)';
      case 'auth_resident': return 'Pre-Estimación revisada por superintendente'; // Matching image text roughly
      case 'auth_super': return 'Autorizada por Superintendente';
      case 'auth_leader': return 'Autorizada por Líder';
      case 'validated_compras': return 'Validada por Compras';
      case 'factura_subida': return 'Factura Subida';
      case 'validated_finanzas': return 'Validada por Finanzas';
      case 'paid': return 'Pagada';
      default: return status.replace(/_/g, " ");
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'registered': return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
      case 'auth_resident': return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"; // Image style
      case 'auth_super': return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
      case 'paid': return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200";
    }
  };

  return (
    <Card
      className={`w-full overflow-hidden shadow-lg border-border bg-card mb-6 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-xl' : ''}`}
      onClick={onClick}
    >
      {/* Top Action Bar & Branding */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Show Approve/Reject if enabled */}
          {showActions && onApprove && (
             <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-w-[120px]"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
            >
              <Check className="mr-2 h-4 w-4" /> AUTORIZAR
            </Button>
          )}
          {showActions && onReject && (
            <Button
              variant="destructive"
              className="font-bold shadow-md min-w-[120px]"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
            >
              <X className="mr-2 h-4 w-4" /> RECHAZAR
            </Button>
          )}
          {/* If no approve/reject actions but we want to show something else, we could add it here via children or props.
              For now, if not showing approval actions, we might show nothing or custom buttons. */}
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
                <Badge variant="outline" className={getStatusBadgeStyle(estimation.status)}>
                  {formatStatus(estimation.status).toUpperCase()}
                </Badge>
                <span className="text-slate-400">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(estimation.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
             </p>
          </div>
        </div>

        {/* Content Columns - "Datos del Contrato" */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-slate-700 font-semibold text-lg border-l-4 border-primary pl-3">
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
                  <DataRow label="Número de contrato" value={contract?.name || estimation.contractId || "N/A"} />
                  <DataRow label="Fecha" value={new Date(estimation.createdAt).toLocaleDateString()} />
                  <DataRow label="Número de pedido" value={estimation.projectNumber} />
                  <DataRow label="Importe de pedido" value={formatCurrency(estimation.amount)} />
                  <DataRow label="Tipo de moneda" value="MXN" />
                  <DataRow
                    label="Estatus"
                    value={
                      <Badge variant="outline" className={getStatusBadgeStyle(estimation.status)}>
                         {formatStatus(estimation.status)}
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
                   <DataRow
                      label="Importe del contrato"
                      value={<span className="font-bold">{formatCurrency(contractAmount)}</span>}
                   />
                   <DataRow
                      label="Importe de anticipo"
                      value={formatCurrency(advanceAmount)}
                   />
                   <DataRow label="Porcentaje de anticipo" value="30.00%" />
                   <DataRow
                      label="Anticipo amortizado"
                      value={<span className="text-red-600">-{formatCurrency(amortizedAmount)}</span>}
                   />
                   <DataRow
                      label="Anticipo por amortizar"
                      value={<span className="text-emerald-600 font-bold">{formatCurrency(pendingAmortization)}</span>}
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

        {/* Detail/Grid Placeholder */}
         <div className="space-y-4 pt-4">
           <div className="flex items-center justify-between text-slate-700 font-semibold text-lg border-l-4 border-slate-400 pl-3">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5" /> Detalle
              </div>
              {/* Optional: Add "Ver Detalle" button here if needed */}
           </div>

           <Card className="bg-white border-border/60 min-h-[100px] flex flex-col items-center justify-center text-muted-foreground border-dashed border-2 p-4">
              <p>Detalle de conceptos disponible en PDF adjunto</p>
              {estimation.estimationText && (
                <p className="mt-2 text-sm text-foreground/80 italic">"{estimation.estimationText}"</p>
              )}
           </Card>
        </div>

      </div>
    </Card>
  );
}
