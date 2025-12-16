import { useEstimationStore } from "@/lib/estimationStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProjectConfig() {
  const { projectConfig, setProjectConfig } = useEstimationStore();

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-bold">Configuración del Flujo de Aprobación</CardTitle>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          Modo Soporte Técnico
        </Badge>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4 bg-card/50">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${projectConfig.requiresResident ? 'bg-primary/10' : 'bg-muted'}`}>
                <ShieldCheck className={`h-6 w-6 ${projectConfig.requiresResident ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resident-approval" className="text-base font-medium">
                  Aprobación de Residente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Requiere que un Residente de Obra apruebe la estimación antes de pasar al Superintendente.
                </p>
              </div>
            </div>
            <Switch
              id="resident-approval"
              checked={projectConfig.requiresResident}
              onCheckedChange={(checked) => setProjectConfig({ requiresResident: checked })}
            />
          </div>

          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4 bg-card/50">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${projectConfig.requiresSuperintendent ? 'bg-primary/10' : 'bg-muted'}`}>
                <ShieldCheck className={`h-6 w-6 ${projectConfig.requiresSuperintendent ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="super-approval" className="text-base font-medium">
                  Aprobación de Superintendente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Requiere que un Superintendente apruebe la estimación antes de pasar al Líder de Proyecto.
                </p>
              </div>
            </div>
            <Switch
              id="super-approval"
              checked={projectConfig.requiresSuperintendent}
              onCheckedChange={(checked) => setProjectConfig({ requiresSuperintendent: checked })}
            />
          </div>

          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4 bg-card/50">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${projectConfig.requiresLeader ? 'bg-primary/10' : 'bg-muted'}`}>
                <ShieldCheck className={`h-6 w-6 ${projectConfig.requiresLeader ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="leader-approval" className="text-base font-medium">
                  Aprobación de Líder de Proyecto
                </Label>
                <p className="text-sm text-muted-foreground">
                  Requiere que un Líder de Proyecto apruebe la estimación antes de pasar al área de Compras.
                </p>
              </div>
            </div>
            <Switch
              id="leader-approval"
              checked={projectConfig.requiresLeader}
              onCheckedChange={(checked) => setProjectConfig({ requiresLeader: checked })}
            />
          </div>
        </div>

        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-primary">Flujo Actual:</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Inicio</span>
            <span>→</span>
            {projectConfig.requiresResident && (
              <>
                <Badge variant="secondary">Residente</Badge>
                <span>→</span>
              </>
            )}
            {projectConfig.requiresSuperintendent && (
              <>
                <Badge variant="secondary">Superintendente</Badge>
                <span>→</span>
              </>
            )}
            {projectConfig.requiresLeader && (
              <>
                <Badge variant="secondary">Líder</Badge>
                <span>→</span>
              </>
            )}
            <Badge variant="secondary">Compras</Badge>
            <span>→</span>
            <Badge variant="secondary">Factura</Badge>
            <span>→</span>
            <Badge variant="secondary">Finanzas</Badge>
            <span>→</span>
            <span className="font-medium text-foreground">Pago</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
