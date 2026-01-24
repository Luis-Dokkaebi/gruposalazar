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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Loader2, AlertCircle, Eye, Pencil, Check, ChevronsUpDown, FileInput } from "lucide-react";
import { toast } from "sonner";
import { EmailModal } from "@/components/EmailModal";
import { EstimationDetailModal } from "@/components/EstimationDetailModal";
import { AnalystEstimationForm } from "@/components/estimations/AnalystEstimationForm";
import { AnalystCreationForm } from "@/components/estimations/AnalystCreationForm";
import { mapDbEstimationToFrontend } from "@/lib/estimationMapper";
import { parseDocument } from "@/lib/documentParser";
import type { Database } from "@/integrations/supabase/types";
import { Estimation } from "@/types/estimation";
import { PageHeader } from "@/components/PageHeader";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Contract = Database['public']['Tables']['contracts']['Row'];

export default function Estimaciones() {
  const { currentRole, emailNotifications } = useEstimationStore();
  const { currentProjectId, currentProject } = useProject();
  const { estimations: dbEstimations, loading, error, createEstimation, refetch } = useProjectEstimations(currentProjectId);
  
  const [selectedNotification, setSelectedNotification] = useState<typeof emailNotifications[0] | null>(null);
  const [selectedEstimation, setSelectedEstimation] = useState<Estimation | null>(null);
  const [isAnalystProcessing, setIsAnalystProcessing] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pdfDetails, setPdfDetails] = useState<Record<string, any> | undefined>(undefined);
  
  // Filter state: 'all', 'submitted', 'resident', 'superintendent', 'authorized'
  const [activeFilter, setActiveFilter] = useState("all");

  const [openContract, setOpenContract] = useState(false);
  const [contractSearch, setContractSearch] = useState("");

  const [formData, setFormData] = useState({
    contractId: "",
    contractorName: "",
    estimationText: "",
    amount: "",
    pdfFile: null as File | null,
    // Summary Fields
    total_esta_estimacion: "",
    amortizacion: "",
    subtotal: "",
    iva: "",
    total_facturar: "",
  });

  // Set default filter for Analyst
  useEffect(() => {
    if (currentRole === 'analista_estimaciones') {
      setActiveFilter("submitted");
    }
  }, [currentRole]);

  // Fetch contracts for the current project
  useEffect(() => {
    if (!currentProjectId) return;

    const fetchProjectData = async () => {
      const { data } = await supabase.from('contracts').select('*').eq('project_id', currentProjectId);
      if (data) setContracts(data);
    };

    fetchProjectData();
  }, [currentProjectId]);

  // Map DB estimations to frontend format
  const estimations = dbEstimations.map(est => mapDbEstimationToFrontend(est as any));

  // --- Filter Logic ---
  const filteredEstimations = estimations.filter((est) => {
    let statusCategory = "other";

    // Status mapping
    if (est.status === "submitted_by_contractor") statusCategory = "submitted";
    else if (est.status === "registered") statusCategory = "resident";
    else if (est.status === "auth_resident") statusCategory = "superintendent";
    else if (est.status === "paid") statusCategory = "paid";
    else if (["auth_super", "auth_leader", "validated_compras", "factura_subida", "validated_finanzas"].includes(est.status)) {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, pdfFile: file }));

      // Extract filename without extension for contract search
      const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setContractSearch(fileNameWithoutExt);

      // Attempt to parse Document (PDF or Image)
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setIsParsing(true);
        try {
          const parsed = await parseDocument(file);

          setFormData(prev => ({
            ...prev,
            contractorName: parsed.contractorName || prev.contractorName,
            amount: parsed.amount ? parsed.amount.toString() : prev.amount,
            estimationText: parsed.estimationText || prev.estimationText,
            // Populate summary fields from parsed details
            total_esta_estimacion: parsed.details.summary?.total_esta_estimacion?.toString() || prev.total_esta_estimacion,
            amortizacion: parsed.details.summary?.amortizacion?.toString() || prev.amortizacion,
            subtotal: parsed.details.summary?.subtotal?.toString() || prev.subtotal,
            iva: parsed.details.summary?.iva?.toString() || prev.iva,
            total_facturar: parsed.details.summary?.total_facturar?.toString() || parsed.amount?.toString() || prev.total_facturar,
          }));

          setPdfDetails(parsed.details);
          toast.success("Datos extraídos del documento correctamente");

          // Try to match contract number if available or use filename
          let match = null;

          if (parsed.contractId) {
            match = contracts.find(c => c.name.includes(parsed.contractId!) || (c.description && c.description.includes(parsed.contractId!)));
          }

          if (!match) {
             match = contracts.find(c => fileNameWithoutExt.includes(c.name));
          }

          if (match) {
             setFormData(prev => ({ ...prev, contractId: match!.id }));
             setContractSearch(match.name);
          } else {
             setFormData(prev => ({ ...prev, contractId: "" }));
          }

        } catch (err) {
          console.error("Document Parsing error:", err);
          toast.warning("No se pudieron extraer datos automáticos. Por favor llena los campos manualmente.");
        } finally {
          setIsParsing(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation adjustments:
    if ((!formData.contractId && !contractSearch) || !formData.contractorName || !formData.amount) {
      toast.error("Por favor completa los campos requeridos.");
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
      let finalContractId = formData.contractId;

      // Logic to create a new contract if ID is missing but we have a search term
      if (!finalContractId && contractSearch) {
         const existing = contracts.find(c => c.name.toLowerCase() === contractSearch.toLowerCase());
         if (existing) {
             finalContractId = existing.id;
         } else {
             const { data: newContract, error: createError } = await supabase
                 .from('contracts')
                 .insert({
                     project_id: currentProjectId,
                     name: contractSearch,
                     description: 'Contrato creado automáticamente desde estimación'
                 })
                 .select()
                 .single();

             if (createError) throw createError;
             if (newContract) {
                 finalContractId = newContract.id;
                 setContracts(prev => [...prev, newContract]);
                 toast.info(`Contrato "${contractSearch}" creado automáticamente.`);
             }
         }
      }

      const publicUrl = await uploadFile(formData.pdfFile);

      const folio = `EST-${Date.now().toString(36).toUpperCase()}`;
      const projectNumber = currentProject?.name || 'PROJ-001';

      // DETERMINE STATUS
      const initialStatus = (currentRole === 'contratista' || currentRole === 'analista_estimaciones')
        ? 'submitted_by_contractor' as any
        : 'registered';

      // Update pdfDetails with user-verified form data
      const finalPdfDetails = {
        ...pdfDetails,
        summary: {
           total_esta_estimacion: parseFloat(formData.total_esta_estimacion || "0"),
           amortizacion: parseFloat(formData.amortizacion || "0"),
           subtotal: parseFloat(formData.subtotal || "0"),
           iva: parseFloat(formData.iva || "0"),
           total_facturar: parseFloat(formData.total_facturar || formData.amount || "0"),
        }
      };

      await createEstimation({
        folio,
        project_number: projectNumber,
        contractor_name: formData.contractorName,
        amount: parseFloat(formData.amount),
        estimation_text: formData.estimationText || "Estimación enviada por contratista",
        contract_id: finalContractId,
        cost_center_id: undefined,
        pdf_url: publicUrl,
        pdf_details: finalPdfDetails,
        status: initialStatus
      });

      toast.success(initialStatus === 'submitted_by_contractor'
        ? "Pre-estimación enviada para análisis"
        : "Estimación creada exitosamente");

      setIsDialogOpen(false);
      
      setFormData({
        contractId: "",
        contractorName: "",
        estimationText: "",
        amount: "",
        pdfFile: null,
        total_esta_estimacion: "",
        amortizacion: "",
        subtotal: "",
        iva: "",
        total_facturar: "",
      });
      setContractSearch("");
      setPdfDetails(undefined);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted_by_contractor":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Pendiente de Análisis</Badge>;
      case "registered":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">En Revisión: Residente</Badge>;
      case "auth_resident":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">En Revisión: Superintendente</Badge>;
      case "auth_super":
        return <Badge variant="default" className="bg-blue-600">Autorizada: Super</Badge>;
      case "auth_leader":
        return <Badge variant="default" className="bg-green-600">Autorizada: Líder</Badge>;
      case "validated_compras":
        return <Badge variant="outline" className="border-blue-600 text-blue-600">Validada: Compras</Badge>;
      case "factura_subida":
        return <Badge variant="outline" className="border-green-600 text-green-600">Factura Subida</Badge>;
      case "validated_finanzas":
        return <Badge variant="outline" className="border-purple-600 text-purple-600">Validada: Finanzas</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-emerald-600">Pagada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  // --- ANALYST MODE ---
  if (isAnalystProcessing && selectedEstimation) {
    return (
      <AnalystEstimationForm
        estimation={selectedEstimation}
        projectId={currentProjectId}
        onSuccess={() => {
          setIsAnalystProcessing(false);
          setSelectedEstimation(null);
          refetch();
        }}
        onCancel={() => {
          setIsAnalystProcessing(false);
          setSelectedEstimation(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Estimaciones"
        subtitle="Gestiona y visualiza el estado de tus estimaciones"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Estimaciones" },
        ]}
        actions={
          (currentRole === "contratista" || currentRole === "analista_estimaciones") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Estimación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                {currentRole === 'analista_estimaciones' ? (
                  <AnalystCreationForm
                    projectId={currentProjectId!}
                    onSuccess={() => {
                      setIsDialogOpen(false);
                      refetch();
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                    createEstimation={createEstimation}
                  />
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Subir Pre-estimación</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                      {/* Simplified Header for Contractor */}
                      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800 mb-4">
                        Sube tu archivo de estimación. El sistema extraerá los datos financieros para su revisión.
                      </div>

                      <div className="space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                        <Label htmlFor="pdf" className="text-base font-semibold">Cargar Evidencia (PDF/Imagen) *</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="pdf"
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileChange}
                            className="bg-background"
                          />
                        </div>
                        {isParsing && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analizando documento...
                          </div>
                        )}
                        {formData.pdfFile && !isParsing && (
                          <p className="text-sm text-green-600 mt-1">
                            Archivo: {formData.pdfFile.name}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="contract">Contrato (Opcional)</Label>
                    <Popover open={openContract} onOpenChange={setOpenContract}>
                      <PopoverTrigger asChild>
                        <Button
                          id="contract"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openContract}
                          className="w-full justify-between bg-background"
                        >
                          {formData.contractId
                            ? contracts.find((contract) => contract.id === formData.contractId)?.name
                            : (contractSearch || "Selecciona o busca un contrato...")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Buscar contrato..."
                            value={contractSearch}
                            onValueChange={setContractSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron contratos.</CommandEmpty>
                            <CommandGroup>
                              {contracts.map((contract) => (
                                <CommandItem
                                  key={contract.id}
                                  value={contract.name}
                                  onSelect={(currentValue) => {
                                    setFormData(prev => ({ ...prev, contractId: contract.id }));
                                    setContractSearch(contract.name);
                                    setOpenContract(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.contractId === contract.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {contract.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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

                  {/* Summary Financial Fields - Extracted and Editable */}
                  <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t">
                     <h3 className="font-semibold text-primary">Resumen Financiero (De Evidencia)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="total_esta_estimacion">Total Esta Estimación</Label>
                          <Input
                            id="total_esta_estimacion"
                            type="number"
                            step="0.01"
                            value={formData.total_esta_estimacion}
                            onChange={(e) => setFormData({ ...formData, total_esta_estimacion: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amortizacion" className="text-red-600">Amortización</Label>
                          <Input
                            id="amortizacion"
                            type="number"
                            step="0.01"
                            value={formData.amortizacion}
                            onChange={(e) => setFormData({ ...formData, amortizacion: e.target.value })}
                            className="bg-background text-red-600"
                          />
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor="subtotal">Subtotal</Label>
                          <Input
                            id="subtotal"
                            type="number"
                            step="0.01"
                            value={formData.subtotal}
                            onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="iva">16% IVA</Label>
                          <Input
                            id="iva"
                            type="number"
                            step="0.01"
                            value={formData.iva}
                            onChange={(e) => setFormData({ ...formData, iva: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="total_facturar" className="font-bold">Total a Facturar (Neto)</Label>
                          <Input
                            id="total_facturar"
                            type="number"
                            step="0.01"
                            value={formData.total_facturar}
                            onChange={(e) => {
                                setFormData({
                                    ...formData,
                                    total_facturar: e.target.value,
                                    amount: e.target.value // Sync with main amount
                                });
                            }}
                            className="bg-green-50 font-bold border-green-200"
                          />
                        </div>
                     </div>
                  </div>

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
                              Enviar Pre-estimación
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </DialogContent>
          </Dialog>
        )
      }
      />

      <div className="space-y-4">
        {/* Quick Filters */}
        <Tabs defaultValue={currentRole === 'analista_estimaciones' ? 'submitted' : 'all'} value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-[1000px]">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="submitted">Pendientes Análisis</TabsTrigger>
            <TabsTrigger value="resident">Revisión Residente</TabsTrigger>
            <TabsTrigger value="superintendent">Revisión Super</TabsTrigger>
            <TabsTrigger value="authorized">Autorizadas</TabsTrigger>
            <TabsTrigger value="paid">Pagadas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table View */}
        <Card className="border-border overflow-hidden">
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
             <div className="p-12 text-center">
              <p className="text-muted-foreground">No se encontraron estimaciones con este filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Contratista</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimations.map((est) => (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.folio}</TableCell>
                      <TableCell>{est.contractorName}</TableCell>
                      <TableCell>${est.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{getStatusBadge(est.status)}</TableCell>
                      <TableCell>{new Date(est.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">

                          {/* Analyst Action: Process */}
                          {currentRole === 'analista_estimaciones' && est.status === 'submitted_by_contractor' && (
                             <Button
                               variant="default"
                               size="sm"
                               onClick={() => {
                                 setSelectedEstimation(est);
                                 setIsAnalystProcessing(true);
                               }}
                               className="bg-primary hover:bg-primary/90"
                             >
                               <FileInput className="h-4 w-4 mr-2" />
                               Capturar
                             </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEstimation(est)}
                            title="Ver Detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                           {currentRole === 'contratista' && (est.status === 'registered' || est.status === 'submitted_by_contractor') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => setSelectedEstimation(est)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <EmailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      {selectedEstimation && !isAnalystProcessing && (
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
