import { useState, useEffect } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EmailModal } from "@/components/EmailModal";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import type { Database } from "@/integrations/supabase/types";
import { Estimation } from "@/types/estimation";
import { PageHeader } from "@/components/PageHeader";
import { EstimationCard } from "@/components/EstimationCard";
import { Card } from "@/components/ui/card";

type Contract = Database['public']['Tables']['contracts']['Row'];
type CostCenter = Database['public']['Tables']['cost_centers']['Row'];

export default function Estimaciones() {
  const { currentRole, emailNotifications } = useEstimationStore();
  const { currentProjectId, currentProject } = useProject();
  const { estimations: dbEstimations, loading, error, createEstimation, refetch } = useProjectEstimations(currentProjectId);
  
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter state: 'all', 'resident', 'superintendent', 'authorized'
  const [activeFilter, setActiveFilter] = useState("all");

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

  // --- Filter Logic ---
  const filteredEstimations = estimations.filter((est) => {
    // Status mapping for filters
    let statusCategory = "other";
    if (est.status === "registered") statusCategory = "resident";
    else if (est.status === "auth_resident") statusCategory = "superintendent";
    else if (["auth_super", "auth_leader", "validated_compras", "factura_subida", "validated_finanzas", "paid"].includes(est.status)) {
      statusCategory = "authorized";
    }

    if (activeFilter !== "all" && statusCategory !== activeFilter) {
      return false;
    }

    return true;
  });

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `EST_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('estimations')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Return file path (not public URL) - signed URLs will be generated on demand
    return filePath;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, pdfFile: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractId || !formData.costCenterId || !formData.contractorName || !formData.estimationText || !formData.amount) {
      toast.error("Por favor completa todos los campos requeridos.");
      return;
    }

    if (!formData.pdfFile) {
      toast.error("Por favor sube un archivo (PDF o Imagen)");
      return;
    }

    if (!currentProjectId) {
      toast.error("Por favor selecciona un proyecto");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload File
      const publicUrl = await uploadFile(formData.pdfFile);

      // 2. Generate folio and project number
      const folio = `EST-${Date.now().toString(36).toUpperCase()}`;
      const projectNumber = currentProject?.name || 'PROJ-001';

      // 3. Create Estimation
      await createEstimation({
        folio,
        project_number: projectNumber,
        contractor_name: formData.contractorName,
        amount: parseFloat(formData.amount),
        estimation_text: formData.estimationText,
        contract_id: formData.contractId || undefined,
        cost_center_id: formData.costCenterId || undefined,
        pdf_url: publicUrl,
      });

      toast.success("Estimación creada exitosamente");
      setIsDialogOpen(false);
      
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
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <PageHeader
        title="Mis Estimaciones"
        subtitle="Gestiona y visualiza el estado de tus estimaciones"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Estimaciones" },
        ]}
        actions={
          currentRole === "contratista" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Estimación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Estimación</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contract">Contrato *</Label>
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
                    <Label htmlFor="costCenter">Centro de Costos *</Label>
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
                    <Label htmlFor="contractor">Nombre del Contratista *</Label>
                    <Input
                      id="contractor"
                      value={formData.contractorName}
                      onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                      placeholder="Nombre completo"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto de la Estimación *</Label>
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
                  <Label htmlFor="pdf">Carga de Evidencia (PDF/Imagen) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pdf"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                      className="bg-background"
                    />
                  </div>
                  {formData.pdfFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Archivo: {formData.pdfFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    value={formData.estimationText}
                    onChange={(e) => setFormData({ ...formData, estimationText: e.target.value })}
                    placeholder="Describe los conceptos incluidos..."
                    className="min-h-[100px] bg-background"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Crear Estimación
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )
      }
      />

      <div className="space-y-6">
        {/* Quick Filters */}
        <Tabs defaultValue="all" value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="resident">En Revisión: Residente</TabsTrigger>
            <TabsTrigger value="superintendent">En Revisión: Superintendente</TabsTrigger>
            <TabsTrigger value="authorized">Autorizadas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* List View */}
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">Cargando estimaciones...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredEstimations.length === 0 ? (
             <div className="p-12 text-center border border-dashed rounded-lg">
              <p className="text-muted-foreground">No se encontraron estimaciones con este filtro.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredEstimations.map((est) => {
                const contract = contracts.find(c => c.id === est.contractId);
                const costCenter = costCenters.find(c => c.id === est.costCenterId);

                return (
                  <EstimationCard
                    key={est.id}
                    estimation={est}
                    contract={contract}
                    costCenter={costCenter}
                    onClick={() => setSelectedEstimation(est)}
                    // We don't show approval actions here as this is "My Estimations" view.
                    // Approval happens in Dashboard/ActionCard for specific roles.
                    showActions={false}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      {selectedEstimation && (
        <EstimationDetailModal
          estimation={selectedEstimation}
          onClose={() => setSelectedEstimation(null)}
          projectId={currentProjectId}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
