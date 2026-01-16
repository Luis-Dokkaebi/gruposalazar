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
  let details: Record<string, any> = {};

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

const extractDataFromText = (fullText: string): ParsedEstimationData => {
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

  // --- Extraction Logic ---

  // 1. Contractor Name
  // Common labels: "Proveedor:", "Contratista:", "Empresa:"
  let contractorName: string | undefined;
  const matchProvider = fullText.match(/(?:Proveedor|Contratista|Empresa):\s*(\d+\s+)?([^\n]+)/i);
  if (matchProvider) {
    contractorName = (matchProvider[2] || matchProvider[1]).trim();
  }

  // 2. Contract ID
  // Common labels: "Número de contrato:", "Contrato No.", "Contrato:"
  let contractId: string | undefined;
  const matchContract = fullText.match(/(?:Número de contrato|Contrato No\.|Contrato)[:\s]*([^\n]+)/i);
  if (matchContract) {
    contractId = matchContract[1].trim();
  }

  // 3. Cost Center
  // Common labels: "Centro de Costos:", "C.C.:", "CC:", "Obra:"
  let costCenterText: string | undefined;
  const matchCC = fullText.match(/(?:Centro de Costos|C\.C\.|CC|Obra)[:\s]*([^\n]+)/i);
  if (matchCC) {
    costCenterText = matchCC[1].trim();
  }

  // 4. Amount
  // Strategy: Look for "Total a facturar", "Total Estimación", "Importe Total", "Neto a Pagar"
  let amount = 0;

  // Prioritize "Total a facturar" or similar specific terms
  let totalStr = extractMoney('Total a facturar');
  if (!totalStr) totalStr = extractMoney('Total esta estimación');
  if (!totalStr) totalStr = extractMoney('Importe Total');
  if (!totalStr) totalStr = extractMoney('Neto a Pagar');
  if (!totalStr) totalStr = extractMoney('Total'); // Fallback, risky

  if (totalStr) {
    const cleanStr = totalStr.replace(/,/g, '');
    amount = parseFloat(cleanStr);
  }

  // --- Details for Debug/Display ---
  details.contractData = {
      project: extract('Proyecto'),
      provider: contractorName,
      contractNumber: contractId,
      costCenter: costCenterText,
      date: extract('Fecha'),
  };

  details.summary = {
      totalToInvoice: totalStr,
  };

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
