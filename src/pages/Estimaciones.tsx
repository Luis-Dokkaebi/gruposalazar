import { useState } from "react";
import { useEstimationStore } from "@/lib/estimationStore";
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
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { EstimationCard } from "@/components/EstimationCard";
import { EmailModal } from "@/components/EmailModal";

export default function Estimaciones() {
  const { currentRole, costCenters, contracts, addEstimation, estimations, emailNotifications } = useEstimationStore();
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  
  const [formData, setFormData] = useState({
    contractId: "",
    costCenterId: "",
    contractorName: "",
    estimationText: "",
    amount: "",
    pdfFile: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, pdfFile: e.target.files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractId || !formData.costCenterId || !formData.contractorName || !formData.estimationText || !formData.amount) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (!formData.pdfFile) {
      toast.error("Por favor sube un archivo PDF");
      return;
    }

    // Simulate PDF upload
    const pdfUrl = URL.createObjectURL(formData.pdfFile);

    addEstimation({
      contractId: formData.contractId,
      costCenterId: formData.costCenterId,
      contractorName: formData.contractorName,
      pdfUrl,
      estimationText: formData.estimationText,
      amount: parseFloat(formData.amount),
    });

    toast.success("Estimación creada exitosamente");
    
    // Show email notification
    setTimeout(() => {
      const latestNotification = emailNotifications[0];
      if (latestNotification) {
        setSelectedNotification(latestNotification);
      }
    }, 500);

    // Reset form
    setFormData({
      contractId: "",
      costCenterId: "",
      contractorName: "",
      estimationText: "",
      amount: "",
      pdfFile: null,
    });
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
                        {center.name} ({center.status})
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

            <Button type="submit" className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Crear Estimación
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Historial de Estimaciones</h2>
        {relevantEstimations.length === 0 ? (
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
