import { useState, useEffect } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Plus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EstimationCard } from "@/components/EstimationCard";
import { EmailModal } from "@/components/EmailModal";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import type { Database } from "@/integrations/supabase/types";

type Contract = Database['public']['Tables']['contracts']['Row'];
type CostCenter = Database['public']['Tables']['cost_centers']['Row'];

export default function Estimaciones() {
  const { currentRole, emailNotifications } = useEstimationStore();
  const { currentProjectId, currentProject } = useProject();
  const { estimations: dbEstimations, loading, error, createEstimation, refetch } = useProjectEstimations(currentProjectId);
  
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    contractId: "",
    costCenterId: "",
    contractorName: "",
    estimationText: "",
    amount: "",
    pdfFile: null as File | null,
  });

  // Fetch contracts and cost centers for the current project
  useEffect(() => {
    if (!currentProjectId) return;

    const fetchProjectData = async () => {
      const [contractsRes, costCentersRes] = await Promise.all([
        supabase.from('contracts').select('*').eq('project_id', currentProjectId),
        supabase.from('cost_centers').select('*').eq('project_id', currentProjectId),
      ]);

      if (contractsRes.data) setContracts(contractsRes.data);
      if (costCentersRes.data) setCostCenters(costCentersRes.data);
    };

    fetchProjectData();
  }, [currentProjectId]);

  // Map DB estimations to frontend format
  const estimations = dbEstimations.map(est => mapDbEstimationToFrontend(est as any));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, pdfFile: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractId || !formData.costCenterId || !formData.contractorName || !formData.estimationText || !formData.amount) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (!formData.pdfFile) {
      toast.error("Por favor sube un archivo PDF");
      return;
    }

    if (!currentProjectId) {
      toast.error("Por favor selecciona un proyecto");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate folio and project number
      const folio = `EST-${Date.now().toString(36).toUpperCase()}`;
      const projectNumber = currentProject?.name || 'PROJ-001';

      await createEstimation({
        folio,
        project_number: projectNumber,
        contractor_name: formData.contractorName,
        amount: parseFloat(formData.amount),
        estimation_text: formData.estimationText,
        contract_id: formData.contractId || undefined,
        cost_center_id: formData.costCenterId || undefined,
      });

      toast.success("Estimación creada exitosamente");
      
      // Reset form
      setFormData({
        contractId: "",
        costCenterId: "",
        contractorName: "",
        estimationText: "",
        amount: "",
        pdfFile: null,
      });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // STRICT FILTERING: Only show what's in user's "cancha" (pending work)
  const relevantEstimations = currentRole === 'contratista' 
    ? estimations // Contratista sees all their estimations
    : estimations.filter(est => {
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

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Estimaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y crea nuevas estimaciones de obra
          </p>
        </div>
        <Card className="p-12 text-center border-border">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Selecciona un proyecto para ver las estimaciones</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis Estimaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y crea nuevas estimaciones de obra
        </p>
      </div>

      {currentRole === "contratista" && (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Nueva Estimación</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contract" className="text-foreground">Contrato</Label>
                <Select
                  value={formData.contractId}
                  onValueChange={(value) => setFormData({ ...formData, contractId: value })}
                >
                  <SelectTrigger id="contract" className="bg-background">
                    <SelectValue placeholder="Selecciona un contrato" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costCenter" className="text-foreground">Centro de Costos</Label>
                <Select
                  value={formData.costCenterId}
                  onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
                >
                  <SelectTrigger id="costCenter" className="bg-background">
                    <SelectValue placeholder="Selecciona un centro de costos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {costCenters.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name} ({center.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractor" className="text-foreground">Nombre del Contratista</Label>
                <Input
                  id="contractor"
                  value={formData.contractorName}
                  onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                  placeholder="Nombre completo"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-foreground">Monto de la Estimación</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf" className="text-foreground">Archivo PDF</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="bg-background"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {formData.pdfFile && (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: {formData.pdfFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Descripción de la Estimación</Label>
              <Textarea
                id="description"
                value={formData.estimationText}
                onChange={(e) => setFormData({ ...formData, estimationText: e.target.value })}
                placeholder="Describe los conceptos incluidos en esta estimación..."
                className="min-h-[100px] bg-background"
              />
            </div>

            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Estimación
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Historial de Estimaciones</h2>
        {loading ? (
          <Card className="p-12 text-center border-border">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Cargando estimaciones...</p>
          </Card>
        ) : error ? (
          <Card className="p-12 text-center border-border">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
          </Card>
        ) : relevantEstimations.length === 0 ? (
          <Card className="p-12 text-center border-border">
            <p className="text-muted-foreground">No hay estimaciones registradas</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {relevantEstimations.map((estimation) => (
              <EstimationCard key={estimation.id} estimation={estimation} />
            ))}
          </div>
        )}
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </div>
  );
}
