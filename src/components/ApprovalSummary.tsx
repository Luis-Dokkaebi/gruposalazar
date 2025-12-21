import { CheckCircle2, User, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ApprovalSummaryProps {
  estimation: {
    status: string;
    resident_approved_at?: string | null;
    superintendent_approved_at?: string | null;
    leader_approved_at?: string | null;
    compras_approved_at?: string | null;
    resident_signed_by?: string | null;
    superintendent_signed_by?: string | null;
    leader_signed_by?: string | null;
    history?: Array<{
      status: string;
      user_name?: string | null;
      role: string;
    }>;
  };
}

interface ApprovalStep {
  role: string;
  label: string;
  status: string;
  approvedAt: string | null | undefined;
  signedBy: string | null | undefined;
  isInherited: boolean;
}

export function ApprovalSummary({ estimation }: ApprovalSummaryProps) {
  // Find who approved each step from history
  const getApproverFromHistory = (status: string): string | null => {
    const entry = estimation.history?.find((h) => h.status === status);
    return entry?.user_name || null;
  };

  const approvalSteps: ApprovalStep[] = [
    {
      role: "residente",
      label: "Residente",
      status: "auth_resident",
      approvedAt: estimation.resident_approved_at,
      signedBy: estimation.resident_signed_by,
      isInherited: !!estimation.resident_signed_by,
    },
    {
      role: "superintendente",
      label: "Superintendente",
      status: "auth_super",
      approvedAt: estimation.superintendent_approved_at,
      signedBy: estimation.superintendent_signed_by,
      isInherited: !!estimation.superintendent_signed_by,
    },
    {
      role: "lider_proyecto",
      label: "Líder de Proyecto",
      status: "auth_leader",
      approvedAt: estimation.leader_approved_at,
      signedBy: estimation.leader_signed_by,
      isInherited: !!estimation.leader_signed_by,
    },
  ];

  // Check if we should show this section
  const hasAnyApproval = approvalSteps.some(
    (step) => step.approvedAt || step.signedBy
  );

  if (!hasAnyApproval) return null;

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-border">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Resumen de Autorizaciones
      </h3>

      <div className="grid gap-3">
        {approvalSteps.map((step) => {
          const approverName = step.isInherited
            ? step.signedBy
            : getApproverFromHistory(step.status);
          const isApproved = !!step.approvedAt || !!step.signedBy;

          return (
            <div
              key={step.role}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isApproved
                  ? step.isInherited
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                    : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-muted/30 border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isApproved
                      ? step.isInherited
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">—</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{step.label}</p>
                  {isApproved && approverName && (
                    <p className="text-sm text-muted-foreground">
                      Firmado por: <span className="font-medium">{approverName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isApproved ? (
                  step.isInherited ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Heredado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobado
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pendiente
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground italic">
        💡 Las autorizaciones con etiqueta "Heredado" fueron firmadas automáticamente
        por el aprobador anterior porque el rol estaba inactivo.
      </p>
    </div>
  );
}
