import { useProject } from '@/contexts/ProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';

export function ProjectSelector() {
  const { projects, currentProjectId, setCurrentProjectId, loading } = useProject();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando proyectos...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Sin proyectos</span>
      </div>
    );
  }

  return (
    <Select value={currentProjectId || ''} onValueChange={setCurrentProjectId}>
      <SelectTrigger className="w-[220px] bg-background">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Seleccionar proyecto" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
