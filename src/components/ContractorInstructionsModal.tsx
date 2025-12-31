import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Upload, CheckCircle2, Send, CreditCard } from "lucide-react";

interface ContractorInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractorInstructionsModal({
  open,
  onOpenChange,
}: ContractorInstructionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <span className="text-yellow-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </span>
            MAPA DE NAVEGACIÓN DEL CONTRATISTA
          </DialogTitle>
          <DialogDescription className="text-base">
            Guía estratégica para la gestión de estimaciones, facturación y pagos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-8 max-w-3xl mx-auto">

            {/* Introducción */}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-muted-foreground text-lg">
                Navegue entre las diferentes pestañas de su Dashboard para gestionar las siguientes áreas estratégicas:
              </p>
            </div>

            {/* Sección 1: Subir Nueva Estimación */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">SUBIR NUEVA ESTIMACIÓN</h3>
              </div>

              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Flujo de Carga</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="relative border-l border-muted ml-3 space-y-6 py-2">
                    <li className="ml-6">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-blue-500 dark:border-slate-900"></span>
                      <p className="font-medium">Ir a la pestaña de estimaciones</p>
                      <p className="text-sm text-muted-foreground">Aquí podrá ver todas las estimaciones subidas previamente.</p>
                    </li>
                    <li className="ml-6">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-muted dark:border-slate-900"></span>
                      <p className="font-medium">Clic en "NUEVA ESTIMACIÓN"</p>
                    </li>
                    <li className="ml-6">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-muted dark:border-slate-900"></span>
                      <div className="space-y-2">
                        <p className="font-medium">Completar Formulario:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-1">
                          <li>Escoger el <strong>contrato</strong> determinado.</li>
                          <li>Escoger el <strong>centro de costos</strong>.</li>
                          <li>Añadir su <strong>nombre de contratista</strong> (Ej. CONSTRUCTORA XYZ).</li>
                          <li>Añadir el <strong>monto</strong> de la estimación.</li>
                          <li>Cargar <strong>PDF o IMAGEN</strong> de la estimación.</li>
                          <li>Añadir una <strong>descripción</strong> detallada.</li>
                        </ul>
                      </div>
                    </li>
                    <li className="ml-6">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-green-500 dark:border-slate-900"></span>
                      <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Send className="w-4 h-4" /> Envío a Soporte Técnico
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Se enviará un correo para autorización. Recibirá actualizaciones conforme su estimación pase los filtros.
                      </p>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </section>

            {/* Sección 2: Facturación y Pago */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">FACTURACIÓN Y PAGO</h3>
              </div>

              <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Proceso de Aprobación y Cobro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 font-semibold mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Filtros de Autorización
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Su estimación debe ser aprobada por:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Residente</Badge>
                        <Badge variant="outline">Superintendente</Badge>
                        <Badge variant="outline">Líder de Proyecto</Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 font-semibold mb-2">
                        <CreditCard className="w-5 h-5 text-purple-500" />
                        Liberación de Pago
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Una vez autorizada, regrese a <strong>MIS ESTIMACIONES</strong>. Verá el estado listo para facturar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Nota Final:</strong> Finanzas recibirá su documentación, liberará el pago y el área de Pagos procesará la transferencia. Recibirá una notificación por correo cuando su pago haya sido liberado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
