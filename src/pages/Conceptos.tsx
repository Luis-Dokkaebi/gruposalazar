import { useEstimationStore } from "@/lib/estimationStore";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Conceptos() {
  const { contracts } = useEstimationStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Conceptos"
        subtitle="Conceptos de costos unitarios por contrato"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Conceptos" },
        ]}
      />

      <div className="space-y-6">
        {contracts.map((contract) => (
          <Card key={contract.id} className="border-border overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{contract.name}</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-foreground font-semibold">Código</TableHead>
                    <TableHead className="text-foreground font-semibold">Descripción</TableHead>
                    <TableHead className="text-foreground font-semibold">Unidad</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Precio Unitario</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Cantidad</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.concepts.map((concept) => (
                    <TableRow key={concept.id}>
                      <TableCell className="font-medium text-foreground">{concept.code}</TableCell>
                      <TableCell className="text-foreground">{concept.description}</TableCell>
                      <TableCell className="text-muted-foreground">{concept.unit}</TableCell>
                      <TableCell className="text-right text-foreground">
                        ${concept.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {concept.quantity.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        ${(concept.unitPrice * concept.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
