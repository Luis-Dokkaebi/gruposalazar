import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { ProjectStats } from "@/hooks/useSupportDashboardData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Settings } from "lucide-react";
import { ProjectRolesConfig } from "./ProjectRolesConfig";

interface ProjectDetailModalProps {
  project: ProjectStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState("audit");

  if (!project) return null;

  // We use the estimations already fetched in ProjectStats
  // Sort estimations by updated_at desc
  const estimations = [...(project.estimations || [])].sort((a: any, b: any) =>
    new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Proyecto: {project.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audit">Auditoría</TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurar Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="flex-1 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Líder Asignado:</span> {project.leader?.full_name || project.leader?.email || "Sin asignar"}
                </div>
                <div>
                  <span className="font-semibold">Estado Global:</span> {project.status === "Active" ? "Activo" : project.status === "Finished" ? "Finalizado" : "Nuevo"}
                </div>
                <div>
                  <span className="font-semibold">Estimación Total:</span> {formatCurrency(project.totalEstimationAmount)}
                </div>
                <div>
                  <span className="font-semibold">Última Actividad:</span> {project.lastActivity ? format(new Date(project.lastActivity), "PPP", { locale: es }) : "Sin actividad"}
                </div>
              </div>

              <div className="border rounded-md mt-4">
                <h3 className="p-4 font-semibold bg-muted/50 border-b">Historial de Estimaciones</h3>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Última Actualización</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estimations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No hay estimaciones registradas.</TableCell>
                        </TableRow>
                      ) : (
                        estimations.map((est: any) => (
                          <TableRow key={est.id}>
                            <TableCell>
                              {est.created_at ? format(new Date(est.created_at), "dd/MM/yyyy", { locale: es }) : "-"}
                            </TableCell>
                            <TableCell>{formatCurrency(est.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{est.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {est.updated_at ? format(new Date(est.updated_at), "dd/MM/yyyy HH:mm", { locale: es }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="flex-1 mt-4">
            <ProjectRolesConfig 
              projectId={project.id} 
              projectName={project.name}
              onClose={() => setActiveTab("audit")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
