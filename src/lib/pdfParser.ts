import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
// We use the CDN to avoid bundling issues with Vite in this specific setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedEstimationData {
  contractorName?: string;
  amount?: number;
  contractId?: string;
  costCenterId?: string;
  estimationText?: string;
  rawText: string;
  details: Record<string, any>;
}

export const parseEstimationPDF = async (file: File): Promise<ParsedEstimationData> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    const details: Record<string, any> = {};

    // Helper for extracting text after a label
    const extract = (label: string) => {
      // Look for Label: Value
      const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, 'i');
      const match = fullText.match(regex);
      return match ? match[1].trim() : null;
    };

    // Helper for extracting money values
    const extractMoney = (label: string) => {
       // Look for Label ... $123,456.78
       // We allow some characters between label and value (like dots or spaces)
       const regex = new RegExp(`${label}.*?\\$?([\\d,]+\\.?\\d{2})`, 'i');
       const match = fullText.match(regex);
       return match ? match[1] : null;
    };

    // Extract Contract Data
    const matchProvider = fullText.match(/Proveedor:\s*(\d+\s+)?([^\n]+)/i);
    const contractorName = matchProvider ? (matchProvider[2] || matchProvider[1]).trim() : undefined;

    const matchContract = fullText.match(/Número de contrato:\s*([^\n]+)/i);
    const contractId = matchContract ? matchContract[1].trim() : undefined;

    details.contractData = {
        project: extract('Proyecto'),
        provider: contractorName,
        contractNumber: contractId,
        acceptanceNumber: extract('Número de aceptación'),
        date: extract('Fecha'),
        orderNumber: extract('Número de pedido'),
        orderAmount: extractMoney('Importe de pedido')
    };

    details.advanceData = {
        contractAmount: extractMoney('Importe del contrato'),
        advanceAmount: extractMoney('Importe de anticipo'),
        advancePercent: extract('Porcentaje de anticipo'),
        amortized: extractMoney('Anticipo amortizado'),
        toAmortize: extractMoney('Anticipo por amortizar')
    };

    // Summary
    // We try to be specific for "Total a facturar" to avoid earlier mentions
    // We look for "Total a facturar" near the end of the text if possible,
    // but regex will find the first one.
    // The summary table usually is at the bottom.
    // However, "Total a facturar" might appear only once or twice.

    // Let's try to capture the block containing "Estimación" header
    details.summary = {
        totalThisEstimation: extractMoney('Total esta estimación'),
        amortization: extractMoney('Amortización'),
        subtotal: extractMoney('Subtotal'),
        iva: extractMoney('16% IVA'),
        totalToInvoice: extractMoney('Total a facturar')
    };

    let amount = 0;
    if (details.summary.totalToInvoice) {
      const amountStr = details.summary.totalToInvoice.replace(/,/g, '');
      amount = parseFloat(amountStr);
    }

    return {
      contractorName,
      amount,
      contractId,
      estimationText: details.contractData.project || 'Estimación cargada desde PDF',
      rawText: fullText,
      details
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("No se pudo procesar el archivo PDF. Asegúrate de que es un PDF válido.");
  }
};
