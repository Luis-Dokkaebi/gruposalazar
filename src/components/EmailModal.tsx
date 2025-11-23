import { EmailNotification } from "@/types/estimation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";

interface EmailModalProps {
  notification: EmailNotification | null;
  onClose: () => void;
}

export function EmailModal({ notification, onClose }: EmailModalProps) {
  if (!notification) return null;

  return (
    <Dialog open={!!notification} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mail className="h-5 w-5 text-primary" />
            Notificación de Correo Electrónico
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="space-y-3">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="font-semibold text-foreground">Asunto:</span>
                <span className="text-foreground">{notification.subject}</span>
              </div>
              
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <span className="font-semibold text-foreground">Para:</span>
                <span className="text-muted-foreground">
                  {notification.to.map(r => r.replace('_', ' ')).join(', ')}
                </span>
              </div>

              <div className="border-t border-border my-3 pt-3">
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-foreground">Proyecto:</span>
                      <p className="text-foreground">{notification.proyecto}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Número de pedido:</span>
                      <p className="text-foreground">{notification.numeroPedido}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-foreground">Número de folio:</span>
                    <p className="text-foreground">{notification.numeroFolio}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Texto:</span>
                    <p className="text-foreground mt-1">{notification.texto}</p>
                  </div>

                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver estimación
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
