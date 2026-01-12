import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProjectInfo, AppRole, ManualCollaborator, APP_ROLES } from '@/types/collaborator';
import { X } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  role: z.enum(APP_ROLES as [string, ...string[]], {
    required_error: "Selecciona un rol",
  }),
  projects: z.array(z.string()).min(1, "Selecciona al menos un proyecto"),
});

interface CollaboratorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { fullName: string; email: string; role: AppRole; projects: ProjectInfo[] }) => void;
  availableProjects: ProjectInfo[];
  initialData?: ManualCollaborator; // Add support for edit mode
}

export function CollaboratorForm({ open, onOpenChange, onSubmit, availableProjects, initialData }: CollaboratorFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      projects: [],
    },
  });

  // Reset form when initialData changes or dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          fullName: initialData.fullName,
          email: initialData.email,
          role: initialData.role,
          projects: initialData.projects.map(p => p.id),
        });
      } else {
        form.reset({
          fullName: "",
          email: "",
          projects: [],
        });
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedProjects = availableProjects.filter(p => values.projects.includes(p.id));
    onSubmit({
      fullName: values.fullName,
      email: values.email,
      role: values.role as AppRole,
      projects: selectedProjects
    });
    // Don't reset here if editing, but usually we close modal.
    onOpenChange(false);
  };

  const toggleProject = (projectId: string) => {
    const current = form.getValues("projects");
    if (current.includes(projectId)) {
      form.setValue("projects", current.filter(id => id !== projectId));
    } else {
      form.setValue("projects", [...current, projectId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Colaborador" : "Registrar Colaborador Externo"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="juan@externo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol Asignado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar Proyectos</FormLabel>
                  <div className="border rounded-md p-3 min-h-[100px] space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {field.value.map(projectId => {
                        const project = availableProjects.find(p => p.id === projectId)
                          // Handle case where project might not be in available list if loaded from manual data with stale ID
                          // Fallback to finding it in initialData? Or just show ID?
                          || initialData?.projects.find(p => p.id === projectId);

                        return (
                          <Badge key={projectId} variant="secondary" className="pl-2 pr-1 py-1">
                            {project?.name || 'Unknown Project'}
                            <button
                              type="button"
                              onClick={() => toggleProject(projectId)}
                              className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select onValueChange={(val) => toggleProject(val)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Agregar proyecto..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProjects.filter(p => !field.value.includes(p.id)).length === 0 ? (
                          <SelectItem value="no_projects" disabled>No hay proyectos disponibles</SelectItem>
                        ) : (
                          availableProjects
                            .filter(p => !field.value.includes(p.id))
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{initialData ? "Guardar Cambios" : "Registrar"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
