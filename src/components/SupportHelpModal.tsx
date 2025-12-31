import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, HelpCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useEstimationStore } from "@/lib/estimationStore";

interface SupportHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportHelpModal({ open, onOpenChange }: SupportHelpModalProps) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { currentRole } = useEstimationStore();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Por favor escribe un mensaje");
      return;
    }

    if (!user || !currentProject) {
      toast.error("Debes estar autenticado y tener un proyecto seleccionado");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          project_id: currentProject.id,
          sender_id: user.id,
          sender_role: currentRole,
          message: message.trim()
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Mensaje enviado a Soporte Técnico");
      
      setTimeout(() => {
        setMessage("");
        setSubmitted(false);
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      contratista: "Contratista",
      residente: "Residente",
      superintendente: "Superintendente",
      lider_proyecto: "Líder de Proyecto",
      compras: "Compras",
      finanzas: "Finanzas",
      pagos: "Pagos"
    };
    return roleNames[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-amber-500" />
            Centro de Ayuda
          </DialogTitle>
          <DialogDescription>
            Envía un mensaje a Soporte Técnico si necesitas asistencia.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            <p className="text-lg font-semibold text-center">
              ¡Mensaje Enviado!
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Soporte Técnico revisará tu mensaje pronto.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Proyecto:</strong> {currentProject?.name || "No seleccionado"}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Tu Rol:</strong> {getRoleName(currentRole)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="help-message">Describe tu problema o consulta</Label>
              <Textarea
                id="help-message"
                placeholder="Escribe aquí tu mensaje para Soporte Técnico..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Enviando..." : "Enviar a Soporte"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Solo usa esta función en casos que realmente lo ameriten.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}