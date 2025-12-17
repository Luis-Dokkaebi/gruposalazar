import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useEstimationStore } from "@/lib/estimationStore";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/types/estimation";

type AppRole = UserRole;

interface ProjectMember {
  id: string;
  user_id: string;
  role: AppRole;
  profiles: {
    email: string;
    full_name?: string;
  };
}

export function ProjectTeam() {
  const { currentProjectId } = useProject();
  const { currentRole } = useEstimationStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [inviteData, setInviteData] = useState({
    email: "",
    role: "" as AppRole
  });

  const fetchMembers = async () => {
    if (!currentProjectId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          profiles (email, full_name)
        `)
        .eq('project_id', currentProjectId);

      if (error) throw error;
      setMembers(data as any);
    } catch (err: any) {
      toast.error(`Error loading members: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentProjectId]);

  const handleInvite = async () => {
    if (!currentProjectId || !inviteData.email || !inviteData.role) {
      toast.error("Complete todos los campos");
      return;
    }

    try {
      // Logic to invite or add user.
      // Since we don't have a full invitation system in the prompt's context,
      // we'll try to find the user by email first.

      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteData.email)
        .single();

      if (userError || !users) {
        // User not found - create invitation token
        const { data: invId, error: invError } = await supabase
          .rpc('create_project_invitation', {
            _project_id: currentProjectId,
            _role: inviteData.role,
            _email: inviteData.email
          });

        if (invError) throw invError;

        // In a real app, send email. Here, show toast.
        toast.success(`Invitación creada para ${inviteData.email}. Copie el link de invitación.`);
        // Ideally we would show the link
      } else {
        // User exists, add directly
        const { error: addError } = await supabase
          .from('project_members')
          .insert({
            project_id: currentProjectId,
            user_id: users.id,
            role: inviteData.role
          });

        if (addError) {
            if (addError.code === '23505') { // Unique violation
                toast.error("El usuario ya tiene este rol en el proyecto");
            } else {
                throw addError;
            }
        } else {
            toast.success("Usuario agregado al equipo");
            fetchMembers();
        }
      }

      setIsInviteOpen(false);
      setInviteData({ email: "", role: "" as AppRole });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Miembro eliminado");
      fetchMembers();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  if (!currentProjectId || currentRole !== 'soporte') return null;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-bold">Equipo del Proyecto</CardTitle>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Miembro
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.profiles.full_name || 'Sin nombre'}
                </TableCell>
                <TableCell>{member.profiles.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {member.role.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(member.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                  No hay miembros asignados a este proyecto
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Miembro al Equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email del Usuario</Label>
              <Input
                placeholder="usuario@ejemplo.com"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol Asignado</Label>
              <Select
                value={inviteData.role}
                onValueChange={(val) => setInviteData({...inviteData, role: val as AppRole})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratista">Contratista</SelectItem>
                  <SelectItem value="residente">Residente</SelectItem>
                  <SelectItem value="superintendente">Superintendente</SelectItem>
                  <SelectItem value="lider_proyecto">Líder de Proyecto</SelectItem>
                  <SelectItem value="compras">Compras</SelectItem>
                  <SelectItem value="finanzas">Finanzas</SelectItem>
                  <SelectItem value="pagos">Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite}>
              <Mail className="h-4 w-4 mr-2" />
              Invitar / Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
