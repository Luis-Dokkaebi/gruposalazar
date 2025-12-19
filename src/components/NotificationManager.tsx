import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecipients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('estimation_notification_recipients')
      .select('*')
      .eq('estimation_id', estimationId);

    if (error) {
      // If table doesn't exist (mock mode or migration pending), we might just fail silently or show empty
      // console.error("Error fetching recipients:", error);
      // For now, let's assume it works or fail gracefully
      setLoading(false);
      return;
    }

    setRecipients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, [estimationId]);

  const handleAddRecipient = async () => {
    if (!newEmail) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('estimation_notification_recipients')
      .insert({
        estimation_id: estimationId,
        email: newEmail,
      });

    if (error) {
      toast({
        title: "Error adding recipient",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setNewEmail("");
      fetchRecipients();
      toast({
        title: "Recipient Added",
        description: `${newEmail} will receive notifications for this estimation.`
      });
    }
  };

  const handleRemoveRecipient = async (id: string) => {
    const { error } = await supabase
      .from('estimation_notification_recipients')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error removing recipient",
        description: error.message,
        variant: "destructive"
      });
    } else {
      fetchRecipients();
      toast({
        title: "Recipient Removed",
        description: "Recipient removed successfully."
      });
    }
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
