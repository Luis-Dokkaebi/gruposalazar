import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

interface ProjectRolesConfigProps {
  projectId: string;
  projectName: string;
  onClose?: () => void;
}

export function ProjectRolesConfig({ projectId, projectName, onClose }: ProjectRolesConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Configuración de Roles: {projectName}
        </CardTitle>
        <CardDescription>
          La configuración de aprobación se ha movido al nivel de estimación individual.
          Ahora puedes decidir si una estimación requiere aprobación al momento de crearla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
          Esta sección ya no es necesaria.
        </div>
      </CardContent>
    </Card>
  );
}
