import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCollaborators } from "@/hooks/useCollaborators";
import { CollaboratorForm } from "./CollaboratorForm";
import { Plus, UserCog, Pencil, Trash2 } from "lucide-react";
import { AppRole, ManualCollaborator, Collaborator, ProjectInfo } from '@/types/collaborator';
import { useToast } from "@/hooks/use-toast";

export function UserManagement() {
  const {
    collaborators,
    loading,
    addCollaborator,
    updateCollaborator,
    toggleStatus,
    deleteCollaborator,
    availableProjects
  } = useCollaborators();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManualCollaborator | null>(null);
  const { toast } = useToast();

  // Pagination for the unified list (Client-side)
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(collaborators.length / ITEMS_PER_PAGE);

  const paginatedCollaborators = collaborators.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const handleEdit = (user: Collaborator) => {
    if (user.type === 'manual') {
      setEditingUser(user);
      setIsFormOpen(true);
    } else {
      // For System users, we currently restrict full editing but acknowledge the action
      // Future work: Implement system user role update dialog
      toast({
        title: "Edición restringida",
        description: "La edición de usuarios del sistema debe realizarse en su perfil o tabla de miembros original.",
        variant: "default" // Not destructive, just info
      });
      // Optionally we could show a dialog to just change the role if simplified.
    }
  };

  const handleDelete = (user: Collaborator) => {
    const message = user.type === 'system'
      ? `¿Estás seguro de que deseas eliminar a ${user.fullName || 'este usuario'} del sistema?\n\nADVERTENCIA: Esta acción eliminará al usuario de TODOS los proyectos asignados.`
      : `¿Estás seguro de que deseas eliminar a ${user.fullName || 'este usuario'}? Esta acción no se puede deshacer.`;

    const isConfirmed = window.confirm(message);
    if (isConfirmed) {
      deleteCollaborator(user.id, user.type);
    }
  };

  const handleFormSubmit = async (data: { fullName: string; email: string; role: AppRole; projects: ProjectInfo[] }) => {
    if (editingUser) {
      updateCollaborator(editingUser.id, data);
    } else {
      await addCollaborator(data);
    }
    setEditingUser(null);
  };

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingUser(null);
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'soporte_tecnico': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'lider_proyecto': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'residente': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'superintendente': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="h-full border-none shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Administración de Usuarios y Roles
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestión centralizada de colaboradores internos y externos.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Colaborador
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="py-8 text-center text-muted-foreground">Cargando usuarios...</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-white">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50/50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Proyectos Asignados</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 w-10"></th> {/* Actions */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    paginatedCollaborators.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{user.fullName || 'Sin nombre'}</span>
                            <span className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</span>
                            {user.type === 'manual' && (
                              <span className="inline-flex mt-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                                Externo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {user.projects.length > 0 ? (
                              user.projects.map(p => (
                                <Badge key={p.id} variant="outline" className="text-xs font-normal bg-white">
                                  {p.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">Sin asignación</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.type === 'system' ? (
                              user.roles.map(role => (
                                <Badge key={role} className={`border-none ${getRoleBadgeColor(role)}`}>
                                  {formatRole(role)}
                                </Badge>
                              ))
                            ) : (
                              <Badge className={`border-none ${getRoleBadgeColor(user.role)}`}>
                                {formatRole(user.role)}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              onCheckedChange={() => toggleStatus(user.id, user.isActive)}
                              disabled={user.type === 'system'}
                            />
                            <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-primary"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-destructive"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <div className="text-xs text-muted-foreground px-2">
                  Página {page + 1} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CollaboratorForm
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleFormSubmit}
        availableProjects={availableProjects}
        initialData={editingUser || undefined}
      />
    </Card>
  );
}
