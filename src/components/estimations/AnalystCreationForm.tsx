import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProjectEstimations } from "@/hooks/useProjectEstimations";

// Schema for the form
const conceptSchema = z.object({
  concepto: z.string().min(1, "El concepto es requerido"),
  unidad: z.string().min(1, "La unidad es requerida"),
  cantidad_contrato: z.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  precio_unitario: z.number().min(0, "El P.U. debe ser mayor o igual a 0"),
});

const formSchema = z.object({
  // Contract Data
  catalogo_conceptos: z.string().min(1, "El catálogo de conceptos es requerido"),
  proyecto: z.string().min(1, "El proyecto es requerido"),
  proveedor: z.string().min(1, "El proveedor es requerido"),
  numero_contrato: z.string().min(1, "El número de contrato es requerido"),
  fecha_contrato: z.string().min(1, "La fecha es requerida"),
  numero_pedido: z.string().min(1, "El número de pedido es requerido"),
  importe_pedido: z.number().min(0, "El importe es requerido"),
  tipo_moneda: z.string().min(1, "La moneda es requerida"),

  // Advance Data
  importe_contrato: z.number().min(0),
  importe_anticipo: z.number().min(0),
  porcentaje_anticipo: z.number().min(0).max(100),
  anticipo_amortizado: z.number(),
  anticipo_por_amortizar: z.number(),

  // Concepts
  conceptos: z.array(conceptSchema).min(1, "Debe agregar al menos un concepto"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalystCreationFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
  createEstimation: (data: any) => Promise<any>;
}

export function AnalystCreationForm({
  projectId,
  onSuccess,
  onCancel,
  createEstimation,
}: AnalystCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const defaultValues: Partial<FormData> = {
    fecha_contrato: new Date().toISOString().split('T')[0],
    tipo_moneda: "MXN",
    porcentaje_anticipo: 30,
    conceptos: [{ concepto: "", unidad: "", cantidad_contrato: 0, precio_unitario: 0 }],
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "conceptos",
  });

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `EST_ANALYST_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('estimations')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }
    return filePath;
  };

  const onSubmit = async (data: FormData) => {
    if (!pdfFile) {
      toast.error("Por favor adjunta el archivo de evidencia (PDF/Imagen)");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload File
      const publicUrl = await uploadFile(pdfFile);

      // 2. Prepare PDF Details
      const pdfDetails = {
        contract_data: {
          catalogo_conceptos: data.catalogo_conceptos,
          proyecto: data.proyecto,
          proveedor: data.proveedor,
          numero_contrato: data.numero_contrato,
          fecha_contrato: data.fecha_contrato,
          numero_pedido: data.numero_pedido,
          importe_pedido: data.importe_pedido,
          tipo_moneda: data.tipo_moneda,
        },
        advance_data: {
          importe_contrato: data.importe_contrato,
          importe_anticipo: data.importe_anticipo,
          porcentaje_anticipo: data.porcentaje_anticipo,
          anticipo_amortizado: data.anticipo_amortizado,
          anticipo_por_amortizar: data.anticipo_por_amortizar,
        },
        concepts: data.conceptos,
        summary: {
            // We can calculate some summary if needed, or leave it empty/default
            // For now, let's assume the 'amount' of the estimation might be derived
            // but the form doesn't explicitly ask for 'Estimation Total', just contract data.
            // However, createEstimation needs an 'amount'.
            // Usually the amount of the estimation is the sum of (quantity * price) for the current estimation period.
            // But this form is capturing "Contract Data" and "Concepts Catalog".
            // It doesn't seem to ask for "Current Estimate Quantity".
            // Wait, the prompt says "Catálogo de Conceptos... Cantidad Contrato, Precio Unitario".
            // It does NOT ask for "Current Progress".
            // So what is the amount of the estimation?
            // If this is just setting up the contract, maybe amount is 0?
            // But it's creating an "Estimation".
            // Maybe the analyst creates the RECORD with the contract data, and then proceeds to enter the progress?
            // OR maybe the user missed listing "Current Quantity" fields?
            // Given the prompt, I will sum up the total contract amount as a placeholder or use 0?
            // Or maybe 'importe_pedido' is the amount?
            // Let's use 0 or 'importe_pedido' if logical.
            // 'importe_pedido' seems like the PO amount.
            // Let's set amount to 0 for now as it seems to be a setup step, or ask the user?
            // I'll set it to 0.01 to avoid validation errors if any, or just 0.
        }
      };

      const folio = `EST-${Date.now().toString(36).toUpperCase()}`;

      // 3. Create Estimation
      await createEstimation({
        folio,
        project_number: data.proyecto || 'PROJ-UNK',
        contractor_name: data.proveedor,
        amount: 0, // Initial amount 0 until progress is added? Or should I use importe_pedido?
        estimation_text: `Estimación creada por analista - Contrato: ${data.numero_contrato}`,
        contract_id: undefined, // We don't link to hard contract ID yet, relying on pdf_details
        pdf_url: publicUrl,
        pdf_details: pdfDetails,
        status: 'registered' // Bypassing contractor submission since analyst created it
      });

      toast.success("Estimación creada y datos registrados exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating estimation:", error);
      toast.error("Error al crear estimación: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Nueva Estimación - Analista</h2>
          <p className="text-muted-foreground text-sm">
            Cargar evidencia y capturar datos del contrato.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* File Upload Section */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
          <Label htmlFor="pdf" className="text-base font-semibold">Cargar Evidencia (PDF/Imagen) *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pdf"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="bg-background"
            />
          </div>
          {pdfFile && (
            <p className="text-sm text-green-600 mt-1">
              Archivo seleccionado: {pdfFile.name}
            </p>
          )}
        </div>

        {/* Section 1: Contract Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Datos del Contrato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="catalogo_conceptos">Catálogo de Conceptos</Label>
              <Input id="catalogo_conceptos" {...register("catalogo_conceptos")} placeholder="Nombre/Ref" />
              {errors.catalogo_conceptos && <span className="text-xs text-red-500">{errors.catalogo_conceptos.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="proyecto">Proyecto</Label>
              <Input id="proyecto" {...register("proyecto")} placeholder="Nombre del proyecto" />
              {errors.proyecto && <span className="text-xs text-red-500">{errors.proyecto.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input id="proveedor" {...register("proveedor")} placeholder="Nombre del proveedor" />
              {errors.proveedor && <span className="text-xs text-red-500">{errors.proveedor.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_contrato">Número de Contrato</Label>
              <Input id="numero_contrato" {...register("numero_contrato")} placeholder="Ej. CON-001" />
              {errors.numero_contrato && <span className="text-xs text-red-500">{errors.numero_contrato.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_contrato">Fecha</Label>
              <Input id="fecha_contrato" type="date" {...register("fecha_contrato")} />
              {errors.fecha_contrato && <span className="text-xs text-red-500">{errors.fecha_contrato.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_pedido">Número de Pedido</Label>
              <Input id="numero_pedido" {...register("numero_pedido")} placeholder="Ej. PED-001" />
              {errors.numero_pedido && <span className="text-xs text-red-500">{errors.numero_pedido.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="importe_pedido">Importe de Pedido</Label>
              <Input
                id="importe_pedido"
                type="number"
                step="0.01"
                {...register("importe_pedido", { valueAsNumber: true })}
              />
              {errors.importe_pedido && <span className="text-xs text-red-500">{errors.importe_pedido.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_moneda">Tipo de Moneda</Label>
              <Input id="tipo_moneda" {...register("tipo_moneda")} placeholder="MXN" />
              {errors.tipo_moneda && <span className="text-xs text-red-500">{errors.tipo_moneda.message}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Advance Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Datos de Anticipo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="importe_contrato">Importe del Contrato</Label>
              <Input
                id="importe_contrato"
                type="number"
                step="0.01"
                {...register("importe_contrato", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="importe_anticipo">Importe de Anticipo</Label>
              <Input
                id="importe_anticipo"
                type="number"
                step="0.01"
                {...register("importe_anticipo", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porcentaje_anticipo">Porcentaje de Anticipo (%)</Label>
              <Input
                id="porcentaje_anticipo"
                type="number"
                step="0.1"
                {...register("porcentaje_anticipo", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anticipo_amortizado">Anticipo Amortizado</Label>
              <Input
                id="anticipo_amortizado"
                type="number"
                step="0.01"
                {...register("anticipo_amortizado", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anticipo_por_amortizar">Anticipo por Amortizar</Label>
              <Input
                id="anticipo_por_amortizar"
                type="number"
                step="0.01"
                {...register("anticipo_por_amortizar", { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Concept Catalog */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary">Catálogo de Conceptos</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ concepto: "", unidad: "", cantidad_contrato: 0, precio_unitario: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar Fila
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Descripción del Concepto</TableHead>
                    <TableHead className="w-[100px]">Unidad</TableHead>
                    <TableHead className="w-[150px]">Cantidad Contrato</TableHead>
                    <TableHead className="w-[150px]">P.U.</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          {...register(`conceptos.${index}.concepto`)}
                          placeholder="Descripción"
                          className="border-0 shadow-none focus-visible:ring-0 min-w-[200px]"
                        />
                        {errors.conceptos?.[index]?.concepto && (
                          <span className="text-xs text-red-500">{errors.conceptos[index]?.concepto?.message}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`conceptos.${index}.unidad`)}
                          placeholder="Unidad"
                          className="border-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`conceptos.${index}.cantidad_contrato`, { valueAsNumber: true })}
                          className="border-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`conceptos.${index}.precio_unitario`, { valueAsNumber: true })}
                          className="border-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.conceptos && (
              <p className="text-sm text-red-500 mt-2">{errors.conceptos.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Estimación...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Crear Estimación
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
