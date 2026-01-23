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
import { Loader2, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Estimation } from "@/types/estimation";

// Schema for the form
const conceptSchema = z.object({
  concepto: z.string().min(1, "El concepto es requerido"),
  unidad: z.string().min(1, "La unidad es requerida"),
  cantidad_contrato: z.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  precio_unitario: z.number().min(0, "El P.U. debe ser mayor o igual a 0"),

  // New columns for analysis
  avance_acumulado_anterior: z.number().optional(),
  cantidad_real: z.number().optional(),
  cantidad_esta_estimacion: z.number().optional(),
  avance_acumulado_actual: z.number().optional(),
  por_estimar: z.number().optional(),
  importe_acumulado: z.number().optional(),
  importe_esta_estimacion: z.number().optional(),
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

  // Summary Data (New Section)
  total_esta_estimacion: z.number().optional(),
  amortizacion: z.number().optional(),
  subtotal: z.number().optional(),
  iva: z.number().optional(),
  total_facturar: z.number().optional(),

  // Concepts
  conceptos: z.array(conceptSchema).min(1, "Debe agregar al menos un concepto"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalystEstimationFormProps {
  estimation: Estimation;
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AnalystEstimationForm({
  estimation,
  projectId,
  onSuccess,
  onCancel,
}: AnalystEstimationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial values from existing pdf_details or empty
  const defaultValues: Partial<FormData> = {
    catalogo_conceptos: estimation.pdf_details?.contract_data?.catalogo_conceptos || "",
    proyecto: estimation.pdf_details?.contract_data?.proyecto || "",
    proveedor: estimation.contractorName || "",
    numero_contrato: estimation.pdf_details?.contract_data?.numero_contrato || "",
    fecha_contrato: estimation.pdf_details?.contract_data?.fecha_contrato || new Date().toISOString().split('T')[0],
    numero_pedido: estimation.pdf_details?.contract_data?.numero_pedido || "",
    importe_pedido: Number(estimation.pdf_details?.contract_data?.importe_pedido) || 0,
    tipo_moneda: estimation.pdf_details?.contract_data?.tipo_moneda || "MXN",

    importe_contrato: Number(estimation.pdf_details?.advance_data?.importe_contrato) || 0,
    importe_anticipo: Number(estimation.pdf_details?.advance_data?.importe_anticipo) || 0,
    porcentaje_anticipo: Number(estimation.pdf_details?.advance_data?.porcentaje_anticipo) || 30,
    anticipo_amortizado: Number(estimation.pdf_details?.advance_data?.anticipo_amortizado) || 0,
    anticipo_por_amortizar: Number(estimation.pdf_details?.advance_data?.anticipo_por_amortizar) || 0,

    // Map extracted summary values
    total_esta_estimacion: Number(estimation.pdf_details?.summary?.total_esta_estimacion) || 0,
    amortizacion: Number(estimation.pdf_details?.summary?.amortizacion) || 0,
    subtotal: Number(estimation.pdf_details?.summary?.subtotal) || 0,
    iva: Number(estimation.pdf_details?.summary?.iva) || 0,
    total_facturar: Number(estimation.pdf_details?.summary?.total_facturar) || Number(estimation.amount) || 0,

    conceptos: estimation.pdf_details?.concepts || [
      { concepto: "", unidad: "", cantidad_contrato: 0, precio_unitario: 0 }
    ],
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "conceptos",
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Structure the data to save in pdf_details
      const pdfDetails = {
        ...estimation.pdf_details, // Keep existing parsing info if any
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
        summary: {
           total_esta_estimacion: data.total_esta_estimacion,
           amortizacion: data.amortizacion,
           subtotal: data.subtotal,
           iva: data.iva,
           total_facturar: data.total_facturar,
        },
        concepts: data.conceptos,
      };

      const { error } = await supabase
        .from("estimations")
        .update({
          pdf_details: pdfDetails,
          status: "registered", // Move to Resident review
          amount: data.total_facturar || estimation.amount, // Update main amount too
        })
        .eq("id", estimation.id);

      if (error) throw error;

      toast.success("Datos capturados y estimación enviada a revisión.");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving estimation details:", error);
      toast.error("Error al guardar los datos: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Captura de Datos - Analista</h2>
          <p className="text-muted-foreground">
            Complete la información del contrato y desglose de conceptos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar y Enviar
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Section 1: Contract Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Datos del Contrato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="catalogo_conceptos">Catálogo de Conceptos</Label>
              <Input id="catalogo_conceptos" {...register("catalogo_conceptos")} placeholder="Nombre o referencia del catálogo" />
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
              <Label>Número de Contrato</Label>
              <Input {...register("numero_contrato")} placeholder="Ej. Segundo Contrato - NIDEC" />
              {errors.numero_contrato && <span className="text-xs text-red-500">{errors.numero_contrato.message}</span>}
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" {...register("fecha_contrato")} />
              {errors.fecha_contrato && <span className="text-xs text-red-500">{errors.fecha_contrato.message}</span>}
            </div>
            <div className="space-y-2">
              <Label>Número de Pedido</Label>
              <Input {...register("numero_pedido")} placeholder="Ej. EST-MK39NIHO" />
              {errors.numero_pedido && <span className="text-xs text-red-500">{errors.numero_pedido.message}</span>}
            </div>
            <div className="space-y-2">
              <Label>Importe de Pedido</Label>
              <Input
                type="number"
                step="0.01"
                {...register("importe_pedido", { valueAsNumber: true })}
              />
              {errors.importe_pedido && <span className="text-xs text-red-500">{errors.importe_pedido.message}</span>}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Moneda</Label>
              <Input {...register("tipo_moneda")} placeholder="MXN" />
              {errors.tipo_moneda && <span className="text-xs text-red-500">{errors.tipo_moneda.message}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Advance Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Anticipo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Importe del Contrato</Label>
              <Input
                type="number"
                step="0.01"
                {...register("importe_contrato", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Importe de Anticipo</Label>
              <Input
                type="number"
                step="0.01"
                {...register("importe_anticipo", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Porcentaje de Anticipo (%)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("porcentaje_anticipo", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Anticipo Amortizado</Label>
              <Input
                type="number"
                step="0.01"
                className="text-red-600"
                {...register("anticipo_amortizado", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Anticipo por Amortizar</Label>
              <Input
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
            <CardTitle className="text-lg font-semibold text-primary">Catálogo de Conceptos / Detalle</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ concepto: "", unidad: "", cantidad_contrato: 0, precio_unitario: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar Concepto
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    {/* Fixed Columns */}
                    <TableHead className="w-[200px]">Concepto</TableHead>
                    <TableHead className="w-[80px]">Unidad</TableHead>
                    <TableHead className="w-[100px]">Cant. Contrato</TableHead>
                    <TableHead className="w-[100px]">P.U.</TableHead>

                    {/* Extracted Columns */}
                    <TableHead className="bg-orange-50 text-orange-900 w-[100px]">Avance Acum. (Ant)</TableHead>
                    <TableHead className="bg-orange-50 text-orange-900 w-[100px]">Cant. Real</TableHead>
                    <TableHead className="bg-orange-100 text-orange-900 font-bold w-[100px]">Esta Est.</TableHead>
                    <TableHead className="bg-orange-50 text-orange-900 w-[100px]">Avance Acum. (Act)</TableHead>
                    <TableHead className="bg-orange-50 text-orange-900 w-[100px]">Por Estimar</TableHead>
                    <TableHead className="bg-orange-50 text-orange-900 w-[120px]">Imp. Acumulado</TableHead>
                    <TableHead className="bg-orange-100 text-orange-900 font-bold w-[120px]">Imp. Esta Est.</TableHead>

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
                          className="border-0 shadow-none focus-visible:ring-0"
                        />
                         {errors.conceptos?.[index]?.concepto && (
                          <span className="text-xs text-red-500">{errors.conceptos[index]?.concepto?.message}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`conceptos.${index}.unidad`)}
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

                      {/* New Extraction Fields */}
                      <TableCell className="bg-orange-50/30">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.avance_acumulado_anterior`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-50/30">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.cantidad_real`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-100/30 font-medium">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.cantidad_esta_estimacion`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-50/30">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.avance_acumulado_actual`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-50/30">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.por_estimar`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-50/30">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.importe_acumulado`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
                      </TableCell>
                      <TableCell className="bg-orange-100/30 font-medium">
                         <Input type="number" step="0.01" {...register(`conceptos.${index}.importe_esta_estimacion`, { valueAsNumber: true })} className="bg-transparent border-0 shadow-none" />
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

        {/* Section 4: Summary Table (Estimación) */}
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Resumen Financiero (Estimación)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex flex-col gap-2">
                   <Label>Total Esta Estimación</Label>
                   <Input type="number" step="0.01" {...register("total_esta_estimacion", { valueAsNumber: true })} />
                </div>
                <div className="flex flex-col gap-2">
                   <Label>Amortización</Label>
                   <Input type="number" step="0.01" className="text-red-600" {...register("amortizacion", { valueAsNumber: true })} />
                </div>
                <div className="flex flex-col gap-2">
                   <Label>Subtotal</Label>
                   <Input type="number" step="0.01" {...register("subtotal", { valueAsNumber: true })} />
                </div>
                <div className="flex flex-col gap-2">
                   <Label>16% IVA</Label>
                   <Input type="number" step="0.01" {...register("iva", { valueAsNumber: true })} />
                </div>
                <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
                   <Label className="text-lg font-bold">Total a Facturar (Neto a Pagar)</Label>
                   <Input type="number" step="0.01" className="text-lg font-bold bg-green-50 border-green-200" {...register("total_facturar", { valueAsNumber: true })} />
                </div>
             </div>
          </CardContent>
        </Card>

      </form>
    </div>
  );
}
