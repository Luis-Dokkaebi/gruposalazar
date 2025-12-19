import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { ProjectStats } from "@/hooks/useSupportDashboardData";
import { formatCurrency } from "@/lib/utils";
import { Eye, Filter, Loader2 } from "lucide-react";
import { ProjectDetailModal } from "./ProjectDetailModal";
// Date range picker is handled via Popover + Calendar below
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectsTableProps {
  projects: ProjectStats[];
  loading: boolean;
}

export function ProjectsTable({ projects, loading }: ProjectsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leaderFilter, setLeaderFilter] = useState<string>("all");
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [selectedProject, setSelectedProject] = useState<ProjectStats | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const leaders = Array.from(
    new Set(projects.map((p) => p.leader?.full_name || p.leader?.email).filter(Boolean))
  );

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const leaderName = project.leader?.full_name || project.leader?.email;
    const matchesLeader = leaderFilter === "all" || leaderName === leaderFilter;

    // Amount Filter
    const min = amountRange.min ? parseFloat(amountRange.min) : 0;
    const max = amountRange.max ? parseFloat(amountRange.max) : Infinity;
    const matchesAmount = project.totalEstimationAmount >= min && project.totalEstimationAmount <= max;

    // Date Filter (Last Activity)
    let matchesDate = true;
    if (dateRange?.from) {
        const activityDate = project.lastActivity ? new Date(project.lastActivity) : null;
        if (!activityDate) {
            matchesDate = false;
        } else {
            const from = dateRange.from;
            const to = dateRange.to || dateRange.from;
            // Set time to compare correctly
            activityDate.setHours(0, 0, 0, 0);
            const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(to); toDate.setHours(23, 59, 59, 999);

            matchesDate = activityDate >= fromDate && activityDate <= toDate;
        }
    }

    return matchesSearch && matchesStatus && matchesLeader && matchesAmount && matchesDate;
  });

  if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Listado Maestro de Proyectos</CardTitle>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Buscar proyecto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Monto Mín"
                        type="number"
                        value={amountRange.min}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-28"
                    />
                    <span>-</span>
                    <Input
                        placeholder="Monto Máx"
                        type="number"
                        value={amountRange.max}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-28"
                    />
                </div>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Filtrar por Fecha (Actividad)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="Active">Activos</SelectItem>
                  <SelectItem value="Finished">Finalizados</SelectItem>
                  <SelectItem value="New">Nuevos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={leaderFilter} onValueChange={setLeaderFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Líder de Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Líderes</SelectItem>
                  {leaders.map((leader: any) => (
                    <SelectItem key={leader} value={leader}>
                      {leader}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estimación Total</TableHead>
                  <TableHead>Estimaciones Activas</TableHead>
                  <TableHead>Líder Asignado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No se encontraron proyectos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.status === "Active"
                              ? "default"
                              : project.status === "Finished"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {project.status === "Active" ? "Activo" :
                           project.status === "Finished" ? "Finalizado" : "Nuevo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(project.totalEstimationAmount)}</TableCell>
                      <TableCell>{project.activeEstimationsCount}</TableCell>
                      <TableCell>
                        {project.leader?.full_name || project.leader?.email || "Sin asignar"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedProject(project);
                            setDetailOpen(true);
                        }}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver Detalles</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredProjects.length} de {projects.length} proyectos
          </div>
        </CardContent>
      </Card>

      <ProjectDetailModal
        project={selectedProject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
