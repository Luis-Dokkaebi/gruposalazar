import { UserRole } from "@/types/estimation";
import { useEstimationStore } from "@/lib/estimationStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

const roleLabels: Record<UserRole, string> = {
  contratista: "Contratista",
  residente: "Residente",
  superintendente: "Superintendente",
  lider_proyecto: "Líder de Proyecto",
  compras: "Compras",
  contabilidad: "Contabilidad",
  almacen: "Almacén",
};

export function RoleSelector() {
  const { currentRole, setCurrentRole } = useEstimationStore();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as UserRole)}>
        <SelectTrigger className="w-[200px] border-0 focus:ring-0 bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {Object.entries(roleLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
