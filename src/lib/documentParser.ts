import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedEstimationData {
  contractorName?: string;
  amount?: number;
  contractId?: string;
  costCenterId?: string; // This will be the extracted text, not the database ID
  estimationText?: string;
  rawText: string;
  details: Record<string, any>;
}

/**
 * Main entry point to parse a document (PDF or Image)
 */
export const parseDocument = async (file: File): Promise<ParsedEstimationData> => {
  let fullText = '';

  try {
    if (file.type === 'application/pdf') {
      fullText = await extractTextFromPDF(file);
    } else if (file.type.startsWith('image/')) {
      fullText = await extractTextFromImage(file);
    } else {
      throw new Error('Formato de archivo no soportado.');
    }

    return extractDataFromText(fullText);

  } catch (error) {
    console.error("Error parsing document:", error);
    throw new Error("No se pudo procesar el archivo. Asegúrate de que es un PDF o una Imagen válida.");
  }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Join with newline to preserve structure for regex line-based matching
    const pageText = textContent.items.map((item: any) => item.str).join('\n');
    fullText += pageText + '\n';
  }

  return fullText;
};

const extractTextFromImage = async (file: File): Promise<string> => {
  const worker = await createWorker('spa');
  const ret = await worker.recognize(file);
  await worker.terminate();
  return ret.data.text;
};

export const extractDataFromText = (fullText: string): ParsedEstimationData => {
  const details: Record<string, any> = {};

  // Helper functions
  const extract = (label: string) => {
    // Look for Label: Value
    // We allow optional colon, whitespace
    const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, 'i');
    const match = fullText.match(regex);
    return match ? match[1].trim() : null;
  };

  const extractMoney = (label: string) => {
     // Look for Label ... $123,456.78
     const regex = new RegExp(`${label}.*?\\$?([\\d,]+\\.?\\d{2})`, 'i');
     const match = fullText.match(regex);
     return match ? match[1] : null;
  };

  // Helper to extract row values (Importe Anterior, Esta Estimación, Acumulado, Por Estimar)
  // Assuming the row contains multiple money values.
  const extractRowValues = (labelPattern: string): number[] | null => {
    const regex = new RegExp(`${labelPattern}.*`, 'i');
    const match = fullText.match(regex);
    if (!match) return null;

    const line = match[0];
    // Find all money-like patterns (allow negative values with -)
    // Matches: $123.45, 123.45, -123.45, $1,234.56
    const moneyMatches = line.match(/-?\$?[\d,]+\.?\d{2}/g);
    if (!moneyMatches) return null;

    return moneyMatches.map(m => parseFloat(m.replace(/[$,]/g, '')));
  };

  // --- Extraction Logic ---

  // 1. Contractor Name
  let contractorName: string | undefined;
  const matchProvider = fullText.match(/(?:Proveedor|Contratista|Empresa):\s*(\d+\s+)?([^\n]+)/i);
  if (matchProvider) {
    contractorName = (matchProvider[2] || matchProvider[1]).trim();
  }

  // 2. Contract ID
  let contractId: string | undefined;
  const matchContract = fullText.match(/(?:Número de contrato|Contrato No\.|Contrato)[:\s]*([^\n]+)/i);
  if (matchContract) {
    contractId = matchContract[1].trim();
  }

  // 3. Cost Center
  let costCenterText: string | undefined;
  const matchCC = fullText.match(/(?:Centro de Costos|C\.C\.|CC|Obra)[:\s]*([^\n]+)/i);
  if (matchCC) {
    costCenterText = matchCC[1].trim();
  }

  // 4. Summary Table Extraction
  // Rows: Total esta estimación, Amortización, Subtotal, IVA, Total a facturar
  // Columns (implied): Anterior, Esta Estimación, Acumulado, Por Estimar.
  // We assume standard column order, so 'This Estimation' is usually index 1 (0-based) or index 0 if 'Anterior' is missing.
  // Based on user image: Anterior ($477k), Esta ($57k), Acumulado ($535k), Por Estimar ($69M).
  // So 'This Estimation' is likely the 2nd value found (Index 1).

  const summaryData: Record<string, any> = {};

  const getThisEstValue = (values: number[] | null) => {
    if (!values || values.length < 2) return values ? values[0] : 0; // Fallback to first if only one
    return values[1]; // Assume 2nd column is 'This Estimation'
  };

  const totalEstValues = extractRowValues('Total esta estimación');
  const amortizacionValues = extractRowValues('Amortizaci[oó]n');
  const subtotalValues = extractRowValues('Subtotal');
  const ivaValues = extractRowValues('(?:IVA|I\\.V\\.A\\.|Impuesto)'); // matches IVA, I.V.A., Impuesto
  const totalFacturarValues = extractRowValues('(?:Total a facturar|Neto a pagar)');

  summaryData.total_esta_estimacion = getThisEstValue(totalEstValues);
  summaryData.amortizacion = getThisEstValue(amortizacionValues);
  summaryData.subtotal = getThisEstValue(subtotalValues);
  summaryData.iva = getThisEstValue(ivaValues);
  summaryData.total_facturar = getThisEstValue(totalFacturarValues); // Should match 'amount'

  // 4. Amount (Use Total a facturar or logic from before)
  let amount = summaryData.total_facturar || 0;

  if (amount === 0) {
      // Fallback strategies
      let totalStr = extractMoney('Total a facturar');
      if (!totalStr) totalStr = extractMoney('Total esta estimación');
      if (!totalStr) totalStr = extractMoney('Importe Total');
      if (!totalStr) totalStr = extractMoney('Neto a Pagar');
      if (!totalStr) totalStr = extractMoney('Total');

      if (totalStr) {
        amount = parseFloat(totalStr.replace(/,/g, ''));
      }
  }

  // --- Concept Table Header Detection ---
  // We can't easily parse rows, but we can detect if the standard headers exist
  const hasConceptTable = /Avance acumulado|Cantidad real|Por estimar/i.test(fullText);

  // --- Details for Debug/Display ---
  details.contractData = {
      project: extract('Proyecto'),
      provider: contractorName,
      contractNumber: contractId,
      costCenter: costCenterText,
      date: extract('Fecha'),
  };

  details.summary = {
      totalToInvoice: amount, // standard field
      ...summaryData // Detailed table values
  };

  if (hasConceptTable) {
      details.hasConceptTable = true;
      // We could add raw text or hints here
  }

  return {
    contractorName,
    amount,
    contractId,
    costCenterId: costCenterText,
    estimationText: details.contractData.project || 'Estimación cargada automáticamente',
    rawText: fullText,
    details
  };
};
