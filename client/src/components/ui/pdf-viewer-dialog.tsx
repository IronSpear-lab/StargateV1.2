import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { PDFAnnotation } from "@/components/EnhancedPDFViewer";

// Detta är en ersättningsfil för pdf-viewer-dialog.tsx
// Den innehåller bara en dummy-komponent som returnerar null
// för att bibehålla bakåtkompatibilitet, men renderar ingenting

export interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  file?: File | null;
  fileData?: {
    filename: string;
    version: string;
    description: string;
    uploaded: string;
    uploadedBy: string;
    fileId?: string;
  };
}

// OBS: DENNA KOMPONENTEN ÄR ERSATT AV PDFDialogProvider och EnhancedPDFViewer
export function PDFViewerDialog({
  open,
  onOpenChange,
  url,
  title,
  file,
  fileData
}: PDFViewerDialogProps) {
  console.warn("VARNING: Den gamla PDFViewerDialog används inte längre - använd PDFDialogProvider istället");
  // Returnerar null för att förhindra rendering
  return null;
}