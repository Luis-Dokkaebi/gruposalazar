import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface EstimationRolesConfigProps {
  estimationId: string;
  folio: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

interface RoleConfig {
  is_resident_active: boolean;
  is_superintendent_active: boolean;
  is_leader_active: boolean;
}

export function EstimationRolesConfig({ estimationId, folio, onClose, onUpdate }: EstimationRolesConfigProps) {
  const [config, setConfig] = useState<RoleConfig>({
    is_resident_active: true,
    is_superintendent_active: true,
    is_leader_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [estimationId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("estimations")
        .select("is_resident_active, is_superintendent_active, is_leader_active")
        .eq("id", estimationId)
        .single();

      if (error) throw error;

      if (data) {
        setConfig({
          is_resident_active: data.is_resident_active ?? true,
          is_superintendent_active: data.is_superintendent_active ?? true,
          is_leader_active: data.is_leader_active ?? true,
        });
      }
    } catch (err: any) {
      toast.error("Error al cargar configuración: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("estimations")
        .update({
          is_resident_active: config.is_resident_active,
          is_superintendent_active: config.is_superintendent_active,
          is_leader_active: config.is_leader_active,
        })
        .eq("id", estimationId);

      if (error) throw error;

      toast.success("Configuración de flujo actualizada correctamente");
      onUpdate?.();
      onClose?.();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getFlowDescription = () => {
    const steps: string[] = ["Contratista"];
    if (config.is_resident_active) steps.push("Residente");
    if (config.is_superintendent_active) steps.push("Superintendente");
    if (config.is_leader_active) steps.push("Líder de Proyecto");
    steps.push("Compras", "Finanzas", "Pagos");
    return steps.join(" → ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configuración de Flujo: {folio}
        </CardTitle>
        <CardDescription>
          Personaliza el flujo de aprobación para esta estimación específica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="resident" className="text-base font-semibold">
                Residente
              </Label>
              <p className="text-sm text-muted-foreground">
                ¿Requiere aprobación del Residente?
              </p>
            </div>
            <Switch
              id="resident"
              checked={config.is_resident_active}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, is_resident_active: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="superintendent" className="text-base font-semibold">
                Superintendente
              </Label>
              <p className="text-sm text-muted-foreground">
                ¿Requiere aprobación del Superintendente?
              </p>
            </div>
            <Switch
              id="superintendent"
              checked={config.is_superintendent_active}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, is_superintendent_active: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="leader" className="text-base font-semibold">
                Líder de Proyecto
              </Label>
              <p className="text-sm text-muted-foreground">
                ¿Requiere aprobación del Líder de Proyecto?
              </p>
            </div>
            <Switch
              id="leader"
              checked={config.is_leader_active}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, is_leader_active: checked }))
              }
            />
          </div>
        </div>

        {/* Flow Preview */}
        <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
          <h4 className="font-semibold mb-2 text-primary">Flujo Resultante</h4>
          <p className="text-sm font-mono">{getFlowDescription()}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
