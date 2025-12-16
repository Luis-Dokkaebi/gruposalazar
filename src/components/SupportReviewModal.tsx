import { useState } from "react";
import { Estimation, UserRole } from "@/types/estimation";
import { useEstimationStore, ProjectConfig } from "@/lib/estimationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";

interface SupportReviewModalProps {
  estimation: Estimation;
  onClose: () => void;
  onComplete: () => void;
}

export function SupportReviewModal({ estimation, onClose, onComplete }: SupportReviewModalProps) {
  const { projectConfig, updateEstimationStatus } = useEstimationStore();
  const [config, setConfig] = useState<ProjectConfig>(projectConfig);
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);

  // Function to calculate next status based on local config
  const calculateNextStatus = () => {
    if (config.requiresResident) return 'registered'; // Pending Resident
    if (config.requiresSuperintendent) return 'auth_resident'; // Pending Super
    if (config.requiresLeader) return 'auth_super'; // Pending Leader
    return 'auth_leader'; // Pending Compras
  };

  const handleSend = async () => {
    try {
      const nextStatus = calculateNextStatus();

      // We are "updating" the status from 'submitted' to 'nextStatus'
      updateEstimationStatus(estimation.id, nextStatus);

      // In a real app, we would send the email here with 'message'
      console.log(`Sending email to ${recipients.join(', ')}: ${message}`);

      toast.success(`Estimación autorizada y enviada a: ${nextStatus}`);
      onComplete();
      onClose();
    } catch (error) {
      toast.error("Error al procesar la estimación");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisión de Soporte Técnico - Folio {estimation.folio}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workflow Configuration */}
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Configuración de Filtros
            </h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="req-resident">Requiere Residente</Label>
              <Switch
                id="req-resident"
                checked={config.requiresResident}
                onCheckedChange={(c) => setConfig({...config, requiresResident: c})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="req-super">Requiere Superintendente</Label>
              <Switch
                id="req-super"
                checked={config.requiresSuperintendent}
                onCheckedChange={(c) => setConfig({...config, requiresSuperintendent: c})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="req-leader">Requiere Líder de Proyecto</Label>
              <Switch
                id="req-leader"
                checked={config.requiresLeader}
                onCheckedChange={(c) => setConfig({...config, requiresLeader: c})}
              />
            </div>
          </div>

          {/* Email Composition */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Send className="h-4 w-4" /> Notificación por Correo
            </h3>

            <div className="space-y-2">
              <Label>Mensaje Personalizado</Label>
              <Textarea
                placeholder="Escribe un mensaje para los destinatarios..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Destinatarios automáticos según configuración:</p>
              <ul className="list-disc pl-5 mt-1">
                {config.requiresResident && <li>Residente</li>}
                {config.requiresSuperintendent && <li>Superintendente</li>}
                {config.requiresLeader && <li>Líder de Proyecto</li>}
                <li>Contratista (Copia)</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} className="gap-2">
            <Send className="h-4 w-4" />
            Autorizar y Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
