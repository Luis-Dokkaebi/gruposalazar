import { ApprovalHistoryEntry } from "@/types/estimation";
import { CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ApprovalTimelineProps {
  history: ApprovalHistoryEntry[];
}

const statusLabels: Record<string, string> = {
  registered: "Estimación Creada",
  auth_resident: "Autorizado por Residente",
  auth_super: "Autorizado por Superintendente",
  auth_leader: "Visto Bueno del Líder",
  validated_compras: "OC Generada - Compras",
  factura_subida: "Factura Subida",
  validated_finanzas: "Validado por Finanzas",
  paid: "Pago Realizado"
};

export function ApprovalTimeline({ history }: ApprovalTimelineProps) {
  const calculateDelay = (current: ApprovalHistoryEntry, previous?: ApprovalHistoryEntry) => {
    if (!previous) return null;
    
    const diffMs = current.timestamp.getTime() - previous.timestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Consider delay if more than 24 hours
    return diffHours > 24 ? diffHours : null;
  };

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-border">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Historial de Aprobaciones
      </h3>
      
      <div className="space-y-3">
        {history.map((entry, index) => {
          const delay = calculateDelay(entry, history[index - 1]);
          const hasDelay = delay && delay > 24;
          
          return (
            <div 
              key={index}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                hasDelay 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasDelay 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">
                    {statusLabels[entry.status] || entry.status}
                  </h4>
                  {hasDelay && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      Demorado {Math.round(delay)} hrs
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-1">
                  Por: <span className="font-medium text-foreground">{entry.userName || entry.role}</span>
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-primary">
                    {format(entry.timestamp, "dd/MMM/yyyy", { locale: es })}
                  </span>
                  <span className="font-bold text-primary">
                    {format(entry.timestamp, "HH:mm", { locale: es })} hrs
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground italic mt-4">
        💡 Los pasos con fondo amarillo indican demoras mayores a 24 horas.
      </p>
    </div>
  );
}
