import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Send, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface RoleInvitationCardProps {
  role: 'residente' | 'superintendente' | 'lider_proyecto';
  roleName: string;
  projectId: string;
  projectName: string;
  isActive: boolean;
  isApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

const roleLabels: Record<string, string> = {
  residente: "Residente",
  superintendente: "Superintendente",
  lider_proyecto: "Líder de Proyecto",
};

export function RoleInvitationCard({
  role,
  roleName,
  projectId,
  projectName,
  isActive,
  isApproved,
  approvedBy,
  approvedAt,
}: RoleInvitationCardProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSendInvitation = async () => {
    if (!email || !name) {
      toast.error("Por favor ingresa el nombre y correo");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor ingresa un correo válido");
      return;
    }

    setIsSending(true);
    try {
      // Create the invitation in the database
      const { data: invitationData, error: inviteError } = await supabase.rpc(
        'create_project_invitation',
        {
          _project_id: projectId,
          _role: role as AppRole,
          _email: email,
          _expires_in_days: 7
        }
      );

      if (inviteError) throw inviteError;

      // Get the invitation token
      const { data: invitation, error: fetchError } = await supabase
        .from('project_invitations')
        .select('token')
        .eq('id', invitationData)
        .single();

      if (fetchError) throw fetchError;

      // Build the invitation URL
      const inviteUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;

      // Send the invitation email
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email,
          inviteUrl,
          projectName,
          role,
          inviterName: name
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Still show success because invitation was created
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">✅ Invitación Creada</div>
            <div className="text-sm">Se creó la invitación para {name}</div>
            <div className="text-sm text-muted-foreground">
              Nota: El correo no se pudo enviar automáticamente. 
              Copia y comparte este enlace manualmente:
            </div>
            <code className="text-xs bg-muted p-2 rounded break-all">{inviteUrl}</code>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">✅ Invitación Enviada</div>
            <div className="text-sm">Se envió la invitación a:</div>
            <div className="text-sm font-semibold text-primary">{email}</div>
            <div className="text-sm text-muted-foreground">
              {name} podrá acceder como {roleLabels[role]}
            </div>
          </div>,
          { duration: 5000 }
        );
      }

      setEmail("");
      setName("");
      setShowForm(false);
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(`Error al enviar invitación: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = () => {
    if (!isActive) {
      return <Badge variant="secondary">Desactivado</Badge>;
    }
    if (isApproved) {
      return <Badge variant="default" className="bg-green-500">Aprobado</Badge>;
    }
    return <Badge variant="outline">Pendiente</Badge>;
  };

  return (
    <Card className={`transition-all ${!isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {roleName}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isApproved && approvedBy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Aprobado por: <strong>{approvedBy}</strong></span>
          </div>
        )}

        {isActive && !isApproved && (
          <>
            {!showForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invitar {roleName}
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor={`name-${role}`} className="text-sm">
                    Nombre del {roleName}
                  </Label>
                  <Input
                    id={`name-${role}`}
                    placeholder="Ej: Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`email-${role}`} className="text-sm">
                    Correo electrónico
                  </Label>
                  <Input
                    id={`email-${role}`}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEmail("");
                      setName("");
                    }}
                    disabled={isSending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendInvitation}
                    disabled={isSending || !email || !name}
                    className="flex-1"
                  >
                    {isSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {isSending ? 'Enviando...' : 'Enviar Invitación'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!isActive && (
          <p className="text-xs text-muted-foreground italic">
            Este rol está desactivado para esta estimación
          </p>
        )}
      </CardContent>
    </Card>
  );
}