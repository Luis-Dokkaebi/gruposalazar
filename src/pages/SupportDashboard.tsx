import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { WorkflowAnalysis } from "@/components/dashboard/WorkflowAnalysis";
import { useSupportDashboardData } from "@/hooks/useSupportDashboardData";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const SupportDashboard = () => {
  const { projects, workload, loading, refetch } = useSupportDashboardData();

  return (
    <div className="space-y-6">
        <PageHeader
          title="Dashboard de Supervisión"
          subtitle="Panel exclusivo de Soporte Técnico para monitoreo y auditoría."
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Supervisión" },
          ]}
          actions={
            <Button onClick={refetch} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          }
        />

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
