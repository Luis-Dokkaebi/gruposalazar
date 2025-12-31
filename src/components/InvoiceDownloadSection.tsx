import { Download, FileText, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceDownloadSectionProps {
  invoicePdfUrl?: string | null;
  invoiceXmlUrl?: string | null;
  folio: string;
}

export function InvoiceDownloadSection({ 
  invoicePdfUrl, 
  invoiceXmlUrl, 
  folio 
}: InvoiceDownloadSectionProps) {
  if (!invoicePdfUrl && !invoiceXmlUrl) return null;

  const handleDownload = (url: string, type: 'pdf' | 'xml') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `factura_${folio}.${type}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
        <Download className="h-4 w-4" />
        Archivos de Factura
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {invoicePdfUrl && (
          <Button
            variant="outline"
            onClick={() => handleDownload(invoicePdfUrl, 'pdf')}
            className="flex items-center gap-2 border-red-500/50 text-red-600 hover:bg-red-500/10"
          >
            <FileText className="h-4 w-4" />
            Descargar PDF
          </Button>
        )}
        {invoiceXmlUrl && (
          <Button
            variant="outline"
            onClick={() => handleDownload(invoiceXmlUrl, 'xml')}
            className="flex items-center gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
          >
            <FileCode className="h-4 w-4" />
            Descargar XML
          </Button>
        )}
      </div>
    </div>
  );
}