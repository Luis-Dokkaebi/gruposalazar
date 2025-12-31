import { useState } from "react";
import { Estimation, UserRole } from "@/types/estimation";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Upload, FileText, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { ApprovalSummary } from "./ApprovalSummary";
import { NotificationManager } from "./NotificationManager";
import { EstimationRolesConfig } from "./dashboard/EstimationRolesConfig";
import { RoleInvitationCard } from "./RoleInvitationCard";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface EstimationDetailModalProps {
  estimation: Estimation & {
    resident_signed_by?: string | null;
    superintendent_signed_by?: string | null;
    leader_signed_by?: string | null;
  };
  onClose: () => void;
  projectId?: string | null;
  onRefresh?: () => void;
}

const statusSteps = [
  { key: "registered", label: "Registrada", step: 1 },
  { key: "auth_resident", label: "Residente", step: 2 },
  { key: "auth_super", label: "Superintendente", step: 3 },
  { key: "auth_leader", label: "Líder", step: 4 },
  { key: "validated_compras", label: "Compras", step: 5 },
  { key: "factura_subida", label: "Factura Subida", step: 6 },
  { key: "validated_finanzas", label: "Finanzas", step: 7 },
  { key: "paid", label: "Pagado", step: 8 },
];

// Email mapping for demo mode
const emailMap: Record<string, string> = {
  'auth_resident': 'superintendente@gruposalazar.com',
  'auth_super': 'lider@gruposalazar.com (copia a juany@gruposalazar.com)',
  'auth_leader': 'compras@gruposalazar.com',
  'validated_compras': 'contratista@empresa.com',
  'factura_subida': 'finanzas@gruposalazar.com',
  'validated_finanzas': 'pagos@gruposalazar.com',
  'paid': 'contratista@empresa.com'
};

export function EstimationDetailModal({ estimation, onClose, projectId, onRefresh }: EstimationDetailModalProps) {
  const { currentRole, updateEstimationStatus, costCenters, contracts } = useEstimationStore();
  const { user } = useAuth();
  const { approveEstimation, uploadInvoice } = useProjectEstimations(projectId || null);
  
  const [invoicePdfFile, setInvoicePdfFile] = useState<File | null>(null);
  const [invoiceXmlFile, setInvoiceXmlFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const costCenter = costCenters.find(cc => cc.id === estimation.costCenterId);
  const contract = contracts.find(c => c.id === estimation.contractId);

  const currentStepIndex = statusSteps.findIndex(s => s.key === estimation.status);
  const progressPercentage = ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getWatermarkConfig = () => {
    if (estimation.status === "paid") {
      return { text: "PAGADO", color: "text-emerald-500/30", bgColor: "bg-emerald-500/5" };
    } else if (estimation.status === "validated_compras" || estimation.status === "factura_subida" || estimation.status === "validated_finanzas") {
      return { text: "VÁLIDO PARA FACTURAR", color: "text-green-500/30", bgColor: "bg-green-500/5" };
    } else {
      return { text: "NO VÁLIDO PARA FACTURA", color: "text-red-500/30", bgColor: "bg-red-500/5" };
    }
  };

  const watermark = getWatermarkConfig();

  const handleAction = async () => {
    // If we have a projectId, use the dynamic database approval
    if (projectId && estimation.id) {
      setIsProcessing(true);
      try {
        const userName = user?.email || 'Usuario';
        const nextStatus = await approveEstimation(
          estimation.id,
          currentRole as AppRole,
          userName
        );
        
        const nextEmail = emailMap[nextStatus] || 'siguiente@gruposalazar.com';
        
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">✅ Autorización Exitosa</div>
            <div className="text-sm">Estado actualizado dinámicamente.</div>
            <div className="text-sm">Correo de notificación enviado a:</div>
            <div className="text-sm font-semibold text-primary">{nextEmail}</div>
          </div>,
          { duration: 4000 }
        );
        
        onRefresh?.();
        setTimeout(() => onClose(), 1500);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Fallback to demo mode with fixed transitions
    let newStatus: Estimation['status'] | null = null;
    
    switch (currentRole) {
      case "residente":
        if (estimation.status === "registered") {
          newStatus = "auth_resident";
        }
        break;
      case "superintendente":
        if (estimation.status === "auth_resident") {
          newStatus = "auth_super";
        }
        break;
      case "lider_proyecto":
        if (estimation.status === "auth_super") {
          newStatus = "auth_leader";
        }
        break;
      case "compras":
        if (estimation.status === "auth_leader") {
          newStatus = "validated_compras";
        }
        break;
      case "finanzas":
        if (estimation.status === "factura_subida") {
          newStatus = "validated_finanzas";
        }
        break;
      case "pagos":
        if (estimation.status === "validated_finanzas") {
          newStatus = "paid";
        }
        break;
    }
    
    if (newStatus) {
      const nextEmail = emailMap[newStatus];
      
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">✅ Autorización Exitosa</div>
          <div className="text-sm">Correo de notificación enviado a:</div>
          <div className="text-sm font-semibold text-primary">{nextEmail}</div>
        </div>,
        { duration: 4000 }
      );
      
      setTimeout(() => {
        updateEstimationStatus(estimation.id, newStatus!);
        onClose();
      }, 2000);
    }
  };

  const handleInvoiceUpload = async () => {
    if (!invoicePdfFile || !invoiceXmlFile) {
      toast.error("Debes subir tanto el PDF como el XML de la factura");
      return;
    }
    
    // Validate XML file extension
    if (!invoiceXmlFile.name.toLowerCase().endsWith('.xml')) {
      toast.error("El archivo XML debe tener extensión .xml");
      return;
    }
    
    // If we have a projectId, use the database upload
    if (projectId && estimation.id) {
      setIsProcessing(true);
      try {
        const userName = user?.email || 'Contratista';
        // In real implementation, upload files to storage first
        const invoiceUrl = `uploads/${invoicePdfFile.name}`;
        const xmlUrl = `uploads/${invoiceXmlFile.name}`;
        
        await uploadInvoice(estimation.id, invoiceUrl, userName);
        
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">✅ Factura Cargada Exitosamente</div>
            <div className="text-sm">PDF: {invoicePdfFile.name}</div>
            <div className="text-sm">XML: {invoiceXmlFile.name}</div>
            <div className="text-sm">Correo de notificación enviado a:</div>
            <div className="text-sm font-semibold text-primary">finanzas@gruposalazar.com</div>
          </div>,
          { duration: 4000 }
        );
        
        onRefresh?.();
        setTimeout(() => onClose(), 1500);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Fallback to demo mode
    toast.success(
      <div className="flex flex-col gap-1">
        <div className="font-bold">✅ Factura Cargada Exitosamente</div>
        <div className="text-sm">PDF: {invoicePdfFile.name}</div>
        <div className="text-sm">XML: {invoiceXmlFile.name}</div>
        <div className="text-sm">Correo de notificación enviado a:</div>
        <div className="text-sm font-semibold text-primary">finanzas@gruposalazar.com</div>
      </div>,
      { duration: 4000 }
    );
    
    setTimeout(() => {
      updateEstimationStatus(estimation.id, "factura_subida");
      onClose();
    }, 2000);
  };

  const getActionButton = () => {
    if (currentRole === "contratista" && estimation.status === "validated_compras") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice-pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                Factura PDF
              </Label>
              <Input
                id="invoice-pdf"
                type="file"
                accept=".pdf"
                onChange={(e) => setInvoicePdfFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {invoicePdfFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {invoicePdfFile.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="invoice-xml" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                Factura XML
              </Label>
              <Input
                id="invoice-xml"
                type="file"
                accept=".xml"
                onChange={(e) => setInvoiceXmlFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {invoiceXmlFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {invoiceXmlFile.name}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleInvoiceUpload}
            disabled={!invoicePdfFile || !invoiceXmlFile || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? 'Procesando...' : 'Subir Factura (PDF + XML)'}
          </Button>
        </div>
      );
    }

    const actionMap: Record<UserRole, { label: string; canAct: boolean }> = {
      residente: { label: "Autorizar Avance", canAct: estimation.status === "registered" },
      superintendente: { label: "Autorizar Técnica", canAct: estimation.status === "auth_resident" },
      lider_proyecto: { label: "Dar Visto Bueno", canAct: estimation.status === "auth_super" },
      compras: { label: "Generar OC y Validar", canAct: estimation.status === "auth_leader" },
      finanzas: { label: "Liberar para Pago", canAct: estimation.status === "factura_subida" },
      pagos: { label: "Confirmar Transferencia", canAct: estimation.status === "validated_finanzas" },
      contratista: { label: "", canAct: false },
      soporte_tecnico: { label: "", canAct: false },
    };

    const action = actionMap[currentRole];
    
    if (!action.canAct) return null;

    return (
      <Button onClick={handleAction} disabled={isProcessing} className="w-full">
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? 'Procesando...' : action.label}
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

  const showConfigTab = currentRole === 'soporte_tecnico';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Detalle de Estimación</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
           {showConfigTab && (
            <TabsList className="mb-4">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configuración
              </TabsTrigger>
            </TabsList>
           )}

          <TabsContent value="details">
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

                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
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

                {/* Role Invitation Cards - Only for soporte_tecnico */}
                {currentRole === 'soporte_tecnico' && projectId && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Invitar Aprobadores</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <RoleInvitationCard
                        role="residente"
                        roleName="Residente"
                        projectId={projectId}
                        projectName={estimation.projectNumber}
                        isActive={estimation.is_resident_active}
                        isApproved={!!estimation.resident_approved_at}
                        approvedBy={estimation.resident_signed_by}
                        approvedAt={estimation.resident_approved_at}
                      />
                      <RoleInvitationCard
                        role="superintendente"
                        roleName="Superintendente"
                        projectId={projectId}
                        projectName={estimation.projectNumber}
                        isActive={estimation.is_superintendent_active}
                        isApproved={!!estimation.superintendent_approved_at}
                        approvedBy={estimation.superintendent_signed_by}
                        approvedAt={estimation.superintendent_approved_at}
                      />
                      <RoleInvitationCard
                        role="lider_proyecto"
                        roleName="Líder de Proyecto"
                        projectId={projectId}
                        projectName={estimation.projectNumber}
                        isActive={estimation.is_leader_active}
                        isApproved={!!estimation.leader_approved_at}
                        approvedBy={estimation.leader_signed_by}
                        approvedAt={estimation.leader_approved_at}
                      />
                    </div>
                  </div>
                )}

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

                {/* Approval Summary - Shows who signed for whom */}
                <ApprovalSummary estimation={estimation} />

                {/* Approval Timeline */}
                <ApprovalTimeline history={estimation.history} />

                {/* Notification Manager for Support */}
                {currentRole === 'soporte_tecnico' && estimation.id && (
                  <NotificationManager estimationId={estimation.id} />
                )}
              </div>
            </div>
          </TabsContent>

          {showConfigTab && (
            <TabsContent value="config">
              <EstimationRolesConfig
                estimationId={estimation.id}
                folio={estimation.folio}
                onUpdate={onRefresh}
                onClose={() => setActiveTab("details")}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
