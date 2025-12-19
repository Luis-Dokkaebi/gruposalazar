import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Mail } from "lucide-react";

interface NotificationManagerProps {
  estimationId: string;
}

interface Recipient {
  id: string;
  email: string;
  estimation_id: string;
}

export function NotificationManager({ estimationId }: NotificationManagerProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Note: This component requires a estimation_notification_recipients table
  // For now, it operates with local state only
  const handleAddRecipient = () => {
    if (!newEmail) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un correo válido.",
        variant: "destructive"
      });
      return;
    }

    const newRecipient: Recipient = {
      id: crypto.randomUUID(),
      email: newEmail,
      estimation_id: estimationId,
    };

    setRecipients(prev => [...prev, newRecipient]);
    setNewEmail("");
    toast({
      title: "Destinatario Agregado",
      description: `${newEmail} recibirá notificaciones de esta estimación.`
    });
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
    toast({
      title: "Destinatario Eliminado",
      description: "Destinatario eliminado correctamente."
    });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando destinatarios...</div>;

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Configuración de Notificaciones (Soporte)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="nuevo@correo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-9"
            />
            <Button size="sm" onClick={handleAddRecipient} disabled={!newEmail}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <div className="space-y-2">
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin destinatarios adicionales.</p>
            ) : (
              recipients.map((recipient) => (
                <div key={recipient.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                  <span>{recipient.email}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive/90"
                    onClick={() => handleRemoveRecipient(recipient.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
