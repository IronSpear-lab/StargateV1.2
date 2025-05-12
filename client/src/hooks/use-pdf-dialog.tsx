import { usePDFDialog as useDialogContext } from "@/components/PDFDialogProvider";

export function usePDFDialog() {
  // Använd hook från Dialog-providern
  const { openPDFDialog, closePDFDialog, dialogState } = useDialogContext();

  // Funktion för att öppna PDF i dialog-läge
  const showPDFDialog = ({
    fileId,
    initialUrl, 
    filename = "Dokument",
    projectId,
    file,
    versionId,
    pdfFile,
    highlightAnnotationId
  }: {
    fileId?: string | number;
    initialUrl?: string;
    filename?: string;
    projectId?: number | null;
    file?: File | null;
    versionId?: number;
    pdfFile?: Blob | null;
    highlightAnnotationId?: number;
  }) => {
    openPDFDialog({
      fileId,
      initialUrl,
      filename,
      projectId,
      file,
      versionId,
      pdfFile,
      highlightAnnotationId
    });
  };

  // Funktion för att stänga PDF-dialogen
  const hidePDFDialog = () => {
    closePDFDialog();
  };

  return {
    showPDFDialog,
    hidePDFDialog,
    isDialogOpen: dialogState.isOpen
  };
}