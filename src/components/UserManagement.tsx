import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string; // profile id
  email: string;
  full_name: string | null;
  project_id: string;
  project_name: string;
  role: AppRole;
  member_id: string; // project_member id
}

const ITEMS_PER_PAGE = 10;

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Fetch project members with pagination
    const { data, error, count } = await supabase
      .from('project_members')
      .select(`
        id,
        role,
        project_id,
        projects (name),
        profiles (id, email, full_name)
      `, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const mappedUsers: UserWithRole[] = (data || []).map((item: any) => ({
      id: item.profiles?.id,
      email: item.profiles?.email,
      full_name: item.profiles?.full_name,
      project_id: item.project_id,
      project_name: item.projects?.name,
      role: item.role,
      member_id: item.id
    })).filter((u: any) => u.id);

    setUsers(mappedUsers);
    setHasMore(count ? from + ITEMS_PER_PAGE < count : false);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    // Logic to prevent modifying other Support users or unauthorized hierarchy changes
    const targetUser = users.find(u => u.member_id === memberId);
    if (!targetUser) return;

    if (targetUser.role === 'soporte_tecnico' && newRole !== 'soporte_tecnico') {
       toast({
        title: "Action Restricted",
        description: "You cannot modify the role of another Technical Support user.",
        variant: "destructive"
       });
       // Reset the select value visually (this is a bit tricky with controlled components,
       // but since we refresh users on success, we might need to force refresh or better, just block the update)
       fetchUsers(); // Revert UI
       return;
    }

    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully."
      });
      fetchUsers();
    }
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (hasMore) setPage(p => p + 1);
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Administración de Usuarios y Roles</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && users.length === 0 ? (
           <div>Loading users...</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Proyecto</th>
                    <th className="px-6 py-3">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.member_id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.full_name || 'Sin nombre'}</div>
                        <div className="text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {user.project_name}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          defaultValue={user.role}
                          onValueChange={(val) => handleRoleChange(user.member_id, val as AppRole)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contratista">Contratista</SelectItem>
                            <SelectItem value="residente">Residente</SelectItem>
                            <SelectItem value="superintendente">Superintendente</SelectItem>
                            <SelectItem value="lider_proyecto">Líder Proyecto</SelectItem>
                            <SelectItem value="compras">Compras</SelectItem>
                            <SelectItem value="finanzas">Finanzas</SelectItem>
                            <SelectItem value="pagos">Pagos</SelectItem>
                            <SelectItem value="soporte_tecnico">Soporte Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <div className="text-sm text-muted-foreground">
                Página {page + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore || loading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
