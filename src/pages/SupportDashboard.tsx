import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { WorkflowAnalysis } from "@/components/dashboard/WorkflowAnalysis";
import { useSupportDashboardData } from "@/hooks/useSupportDashboardData";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const SupportDashboard = () => {
  const { projects, workload, loading, refetch } = useSupportDashboardData();

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard de Supervisión</h2>
            <p className="text-muted-foreground">
              Panel exclusivo de Soporte Técnico para monitoreo y auditoría.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={refetch} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Proyectos</TabsTrigger>
            <TabsTrigger value="analysis">Análisis de Flujo</TabsTrigger>
          </TabsList>
          <TabsContent value="projects" className="space-y-4">
            <ProjectsTable projects={projects} loading={loading} />
          </TabsContent>
          <TabsContent value="analysis" className="space-y-4">
            <WorkflowAnalysis workload={workload} loading={loading} />
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default SupportDashboard;
