import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PDFDialog, PDFDialogContent } from "@/components/ui/pdf-dialog";
import EnhancedPDFViewer from "@/components/EnhancedPDFViewer";

// Typ för dialogen
interface PDFDialogState {
  isOpen: boolean;
  fileId?: string | number;
  initialUrl?: string;
  filename?: string;
  projectId?: number | null;
  file?: File | null;
  versionId?: number;
  pdfFile?: Blob | null;
  highlightAnnotationId?: number;
  annotationId?: number; // För att fokusera på en specifik annotation
  folderId?: number | null; // För att hålla reda på i vilken mapp PDF:en tillhör
}

// Kontextens typ
interface PDFDialogContextType {
  dialogState: PDFDialogState;
  openPDFDialog: (params: Omit<PDFDialogState, 'isOpen'>) => void;
  closePDFDialog: () => void;
}

// Skapa kontext
const PDFDialogContext = createContext<PDFDialogContextType | undefined>(undefined);

// Provider-komponent
export function PDFDialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<PDFDialogState>({
    isOpen: false,
  });

  const openPDFDialog = (params: Omit<PDFDialogState, 'isOpen'>) => {
    setDialogState({ 
      ...params,
      isOpen: true 
    });
  };

  const closePDFDialog = () => {
    setDialogState(prevState => ({ 
      ...prevState,
      isOpen: false 
    }));
  };

  return (
    <PDFDialogContext.Provider value={{ dialogState, openPDFDialog, closePDFDialog }}>
      {children}
      
      <PDFDialog open={dialogState.isOpen} onOpenChange={isOpen => {
        if (!isOpen) closePDFDialog();
      }}>
        <PDFDialogContent className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] p-0 overflow-hidden">
          {dialogState.isOpen && (
            <EnhancedPDFViewer
              fileId={dialogState.fileId}
              initialUrl={dialogState.initialUrl}
              filename={dialogState.filename}
              onClose={closePDFDialog}
              projectId={dialogState.projectId}
              useDatabase={!!dialogState.fileId}
              file={dialogState.file}
              versionId={dialogState.versionId}
              pdfFile={dialogState.pdfFile}
              highlightAnnotationId={dialogState.highlightAnnotationId}
              annotationId={dialogState.annotationId}
              isDialogMode={true}
              folderId={dialogState.folderId} // Skicka med folderId till PDF-visaren för korrekt mappassociation
            />
          )}
        </PDFDialogContent>
      </PDFDialog>
    </PDFDialogContext.Provider>
  );
}

// Hook för att använda PDF-dialogen
export function usePDFDialog() {
  const context = useContext(PDFDialogContext);
  if (context === undefined) {
    throw new Error('usePDFDialog måste användas inom en PDFDialogProvider');
  }
  return context;
}