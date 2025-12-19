import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserWorkload } from "@/hooks/useSupportDashboardData";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface WorkflowAnalysisProps {
  workload: UserWorkload[];
  loading: boolean;
}

export function WorkflowAnalysis({ workload, loading }: WorkflowAnalysisProps) {
  if (loading) {
    return <div>Cargando análisis...</div>;
  }

  // Filter out users with 0 projects to clean up the chart
  const activeWorkload = workload.filter((w) => w.projectCount > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Carga de Trabajo por Usuario</CardTitle>
          <CardDescription>
            Número de proyectos asignados por usuario (posibles cuellos de botella)
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={activeWorkload}>
              <XAxis
                dataKey="userName"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.split(' ')[0]} // Show only first name to save space
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px' }}
              />
              <Legend />
              <Bar
                dataKey="projectCount"
                name="Proyectos"
                fill="#adfa1d"
                radius={[4, 4, 0, 0]}
              />
               <Bar
                dataKey="pendingEstimationsCount"
                name="Estimaciones Pendientes (Líder)"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Top Usuarios con Más Carga</CardTitle>
          <CardDescription>
            Usuarios con mayor número de proyectos activos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {activeWorkload.slice(0, 5).map((user) => (
              <div key={user.userId} className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{user.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.pendingEstimationsCount} estimaciones pendientes
                  </p>
                </div>
                <div className="ml-auto font-medium">
                  {user.projectCount} Proyectos
                </div>
              </div>
            ))}
            {activeWorkload.length === 0 && (
                <div className="text-sm text-muted-foreground">No hay datos suficientes.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
