import { useState } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { useProjectData } from "@/hooks/useProjectData";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FileDown,
  Send,
  Wallet,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Paperclip
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import { Estimation, UserRole } from "@/types/estimation";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

const statusConfig: Record<string, { label: string; variant: string; badge: string }> = {
  registered: { label: "Registrada", variant: "warning", badge: "bg-amber-100 text-amber-700" },
  auth_resident: { label: "Pre-Estimación revisada por residente", variant: "default", badge: "bg-blue-500 text-white" },
  auth_super: { label: "Pre-Estimación revisada por superintendente", variant: "default", badge: "bg-indigo-500 text-white" },
  auth_leader: { label: "Pre-Estimación revisada por líder", variant: "default", badge: "bg-purple-500 text-white" },
  validated_compras: { label: "Validado por Compras", variant: "success", badge: "bg-green-500 text-white" },
  factura_subida: { label: "Factura Subida", variant: "default", badge: "bg-teal-500 text-white" },
  validated_finanzas: { label: "Validado por Finanzas", variant: "default", badge: "bg-cyan-500 text-white" },
  paid: { label: "Pagado", variant: "success", badge: "bg-emerald-600 text-white" },
};

const getFilteredEstimations = (estimations: Estimation[], role: UserRole): Estimation[] => {
  switch (role) {
    case "residente":
      return estimations.filter(e => e.status === "registered");
    case "superintendente":
      return estimations.filter(e => e.status === "auth_resident");
    case "lider_proyecto":
      return estimations.filter(e => e.status === "auth_super");
    case "compras":
      return estimations.filter(e => e.status === "auth_leader");
    case "finanzas":
      return estimations.filter(e => e.status === "factura_subida");
    case "pagos":
      return estimations.filter(e => e.status === "validated_finanzas");
    case "contratista":
      return estimations.filter(e => e.status === "validated_compras");
    default:
      return estimations;
  }
};

export default function Aprobaciones() {
  const { currentRole } = useEstimationStore();
  const { currentProjectId } = useProject();
  const { estimations: dbEstimations, loading, error, refetch, approveEstimation } = useProjectEstimations(currentProjectId);
  const { contracts, costCenters } = useProjectData(currentProjectId);
  const { user } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const estimations = dbEstimations.map(est => mapDbEstimationToFrontend(est as any));
  const filteredEstimations = getFilteredEstimations(estimations, currentRole);
  const currentEstimation = filteredEstimations[currentIndex];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '/');
  };

  const handleApprove = async () => {
    if (!currentProjectId || !currentEstimation) return;
    
    setIsProcessing(true);
    try {
      const userName = user?.email || 'Usuario';
      await approveEstimation(
        currentEstimation.id,
        currentRole as AppRole,
        userName
      );
      
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">✅ Autorización Exitosa</div>
          <div className="text-sm">Folio {currentEstimation.folio}. Pre-estimación actualizada.</div>
          <div className="text-sm">Número de aceptación generado.</div>
        </div>,
        { duration: 4000 }
      );
      
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    toast.info("Funcionalidad de rechazo en desarrollo");
  };

  const handleExportPDF = () => {
    toast.info("Exportando a PDF...");
  };

  const handleAttachSignature = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.success(`Archivo "${file.name}" adjuntado correctamente`);
        // TODO: Implement upload logic here
      }
    };
    input.click();
  };

  const handleSendEmail = () => {
    toast.info("Enviando por correo...");
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < filteredEstimations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!currentProjectId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bandeja de Aprobaciones"
          subtitle="Gestiona las estimaciones pendientes según tu rol actual"
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Aprobaciones" },
          ]}
        />
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Selecciona un proyecto para ver las aprobaciones pendientes</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bandeja de Aprobaciones"
          subtitle="Gestiona las estimaciones pendientes según tu rol actual"
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Aprobaciones" },
          ]}
        />
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Cargando estimaciones...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bandeja de Aprobaciones"
          subtitle="Gestiona las estimaciones pendientes según tu rol actual"
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Aprobaciones" },
          ]}
        />
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </Card>
      </div>
    );
  }

  if (filteredEstimations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bandeja de Aprobaciones"
          subtitle="Gestiona las estimaciones pendientes según tu rol actual"
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Aprobaciones" },
          ]}
        />
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay estimaciones pendientes</h3>
          <p className="text-muted-foreground">
            No tienes estimaciones pendientes de aprobación en este momento.
          </p>
        </Card>
      </div>
    );
  }

  const costCenter = costCenters.find(cc => cc.id === currentEstimation?.costCenterId);
  const contract = contracts.find(c => c.id === currentEstimation?.contractId);
  const config = statusConfig[currentEstimation?.status || 'registered'];

  // Demo data for anticipo section
  const anticipoData = {
    importeContrato: currentEstimation?.amount || 0,
    importeAnticipo: (currentEstimation?.amount || 0) * 0.3,
    porcentajeAnticipo: 30.00,
    anticipoAmortizado: -((currentEstimation?.amount || 0) * 0.25),
    anticipoPorAmortizar: (currentEstimation?.amount || 0) * 0.05,
  };

  return (
    <div className="space-y-4 bg-background min-h-screen">
      {/* Action Bar */}
      <div className="flex items-center gap-2 p-4 bg-muted/30 border-b border-border">
        <Button 
          onClick={handleApprove}
          disabled={isProcessing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isProcessing ? 'Procesando...' : 'Autorizar +'}
        </Button>
        
        <Button 
          onClick={handleReject}
          variant="destructive"
          className="font-semibold"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Rechazar +
        </Button>
        
        <Button 
          onClick={handleExportPDF}
          variant="outline"
          className="font-semibold"
        >
          <FileDown className="mr-2 h-4 w-4" />
          Exportar a PDF
        </Button>

        <Button 
          onClick={handleAttachSignature}
          variant="outline"
          className="font-semibold"
        >
          <Paperclip className="mr-2 h-4 w-4" />
          Adjuntar Firma
        </Button>
        
        <Button 
          onClick={handleSendEmail}
          variant="outline"
          className="font-semibold"
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar por...
        </Button>

        {/* Navigation */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {filteredEstimations.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex === filteredEstimations.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6">
        <h1 className="text-2xl font-bold text-foreground">
          Estimación {currentIndex + 1}
        </h1>
      </div>

      {/* Two Column Layout: Contract Data & Anticipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6">
        {/* Contract Data Panel */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Datos del contrato</span>
          </div>
          
          <Table>
            <TableBody>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30 w-1/3">
                  Proyecto
                </TableCell>
                <TableCell className="text-foreground">
                  {currentEstimation?.projectNumber || 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Proveedor
                </TableCell>
                <TableCell className="text-foreground">
                  {currentEstimation?.contractorName || 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Número de contrato
                </TableCell>
                <TableCell className="text-foreground">
                  {contract?.name || 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Fecha
                </TableCell>
                <TableCell className="text-foreground">
                  {formatDate(currentEstimation?.createdAt)}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Número de pedido
                </TableCell>
                <TableCell className="text-foreground">
                  {currentEstimation?.folio || 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Importe de pedido
                </TableCell>
                <TableCell className="text-foreground font-semibold">
                  {formatCurrency(currentEstimation?.amount || 0)}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Tipo de moneda
                </TableCell>
                <TableCell className="text-foreground">
                  MXN
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Estatus
                </TableCell>
                <TableCell>
                  <Badge className={`${config.badge} text-xs font-semibold px-3 py-1`}>
                    {config.label}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Anticipo Panel */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Anticipo</span>
          </div>
          
          <Table>
            <TableBody>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30 w-1/2">
                  Importe del contrato
                </TableCell>
                <TableCell className="text-foreground text-right font-semibold">
                  {formatCurrency(anticipoData.importeContrato)}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Importe de anticipo
                </TableCell>
                <TableCell className="text-foreground text-right font-semibold">
                  {formatCurrency(anticipoData.importeAnticipo)}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Porcentaje de anticipo
                </TableCell>
                <TableCell className="text-foreground text-right font-semibold">
                  {anticipoData.porcentajeAnticipo.toFixed(2)}%
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Anticipo amortizado
                </TableCell>
                <TableCell className="text-red-600 text-right font-semibold">
                  {formatCurrency(anticipoData.anticipoAmortizado)}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="text-primary font-medium border-l-4 border-l-primary/30">
                  Anticipo por amortizar
                </TableCell>
                <TableCell className="text-foreground text-right font-semibold">
                  {formatCurrency(anticipoData.anticipoPorAmortizar)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Collapsible Section */}
      <div className="px-6 pb-6">
        <Collapsible open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full bg-muted/80 px-4 py-3 border-b border-border flex items-center justify-between hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Detalle</span>
                </div>
                <div className="flex items-center gap-2">
                  {isDetailOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-center font-semibold">Concepto</TableHead>
                      <TableHead className="text-center font-semibold">Unidad</TableHead>
                      <TableHead className="text-center font-semibold">Cantidad Contrato</TableHead>
                      <TableHead className="text-center font-semibold">P.U.</TableHead>
                      <TableHead className="text-center font-semibold">Avance acumulado</TableHead>
                      <TableHead className="text-center font-semibold">Cantidad real</TableHead>
                      <TableHead className="text-center font-semibold">Esta estimación</TableHead>
                      <TableHead className="text-center font-semibold">Avance acumulado</TableHead>
                      <TableHead className="text-center font-semibold">Por estimar</TableHead>
                      <TableHead className="text-center font-semibold">Importe Avance Acumulado</TableHead>
                      <TableHead className="text-center font-semibold">Importe esta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Demo data row */}
                    <TableRow className="hover:bg-muted/30">
                      <TableCell className="text-center">Obra civil</TableCell>
                      <TableCell className="text-center">m²</TableCell>
                      <TableCell className="text-center">1,000</TableCell>
                      <TableCell className="text-center">{formatCurrency(500)}</TableCell>
                      <TableCell className="text-center">750</TableCell>
                      <TableCell className="text-center">750</TableCell>
                      <TableCell className="text-center">100</TableCell>
                      <TableCell className="text-center">850</TableCell>
                      <TableCell className="text-center">150</TableCell>
                      <TableCell className="text-center">{formatCurrency(425000)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(50000)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/30">
                      <TableCell className="text-center">Instalación eléctrica</TableCell>
                      <TableCell className="text-center">ml</TableCell>
                      <TableCell className="text-center">500</TableCell>
                      <TableCell className="text-center">{formatCurrency(150)}</TableCell>
                      <TableCell className="text-center">350</TableCell>
                      <TableCell className="text-center">350</TableCell>
                      <TableCell className="text-center">50</TableCell>
                      <TableCell className="text-center">400</TableCell>
                      <TableCell className="text-center">100</TableCell>
                      <TableCell className="text-center">{formatCurrency(52500)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(7500)}</TableCell>
                    </TableRow>
                    {!currentEstimation?.estimationText && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          No hay detalles de conceptos disponibles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Estimación Summary Table */}
        <div className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-primary/10 px-4 py-3 border-b border-border">
            <span className="font-semibold text-foreground">Estimación</span>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="text-left font-semibold w-1/5"></TableHead>
                  <TableHead className="text-center font-semibold text-primary">Importe avance acumulado anterior</TableHead>
                  <TableHead className="text-center font-semibold text-primary">Importe esta estimación</TableHead>
                  <TableHead className="text-center font-semibold text-primary">Importe avance acumulado</TableHead>
                  <TableHead className="text-center font-semibold text-primary">Importe por estimar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">Total esta estimación</TableCell>
                  <TableCell className="text-center">{formatCurrency(150018.08)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(31841.18)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(181859.26)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(93137.99)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">Amortización</TableCell>
                  <TableCell className="text-center text-red-600">{formatCurrency(-45005.43)}</TableCell>
                  <TableCell className="text-center text-red-600">{formatCurrency(-9552.35)}</TableCell>
                  <TableCell className="text-center text-red-600">{formatCurrency(-54557.78)}</TableCell>
                  <TableCell className="text-center text-red-600">{formatCurrency(-27941.40)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30 bg-muted/20">
                  <TableCell className="font-medium text-muted-foreground">Subtotal</TableCell>
                  <TableCell className="text-center font-semibold">{formatCurrency(105012.65)}</TableCell>
                  <TableCell className="text-center font-semibold">{formatCurrency(22288.83)}</TableCell>
                  <TableCell className="text-center font-semibold">{formatCurrency(127301.48)}</TableCell>
                  <TableCell className="text-center font-semibold">{formatCurrency(65196.59)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">16% IVA</TableCell>
                  <TableCell className="text-center">{formatCurrency(16802.02)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(3566.21)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(20368.24)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(10431.45)}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/10 hover:bg-primary/15">
                  <TableCell className="font-bold text-foreground">Total a facturar</TableCell>
                  <TableCell className="text-center"></TableCell>
                  <TableCell className="text-center font-bold text-lg">{formatCurrency(25855.04)}</TableCell>
                  <TableCell className="text-center"></TableCell>
                  <TableCell className="text-center"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Facturar a */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-sm text-center text-muted-foreground italic">
              Facturar a: <span className="font-semibold text-foreground">CONSTRUCTORA RAMHER DE MEXICO SA DE CV</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}