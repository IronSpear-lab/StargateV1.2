import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Upload, CloudUpload, FileText } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => void;
  acceptedFileTypes: string;
  title: string;
  description: string;
  currentProject: any | null;
}

export function UploadDialog({ 
  open, 
  onOpenChange, 
  onUpload,
  acceptedFileTypes,
  title,
  description,
  currentProject 
}: UploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
      console.log("Filer valda:", fileList.map(f => f.name));
    }
  };

  // Kontrollera om en fil är en giltig PDF
  const verifyPDFFile = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (file.type !== 'application/pdf') {
        resolve(false);
        return;
      }
      
      // Läs de första bytes av filen för att verifiera PDF-signaturen
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) {
          resolve(false);
          return;
        }
        
        try {
          // PDF-filer börjar med "%PDF-"
          const arr = new Uint8Array(result as ArrayBuffer);
          const header = new TextDecoder().decode(arr.slice(0, 5));
          const isPDF = header === '%PDF-';
          
          // Kontrollera även slutet av filen efter EOF-markören
          // Läs hela filen för att göra en mer grundlig kontroll
          const fullReader = new FileReader();
          fullReader.onload = (fullEvent) => {
            try {
              const fullResult = fullEvent.target?.result;
              if (!fullResult) {
                resolve(isPDF); // Basundan på bara header-kontrollen
                return;
              }
              
              const fullArr = new Uint8Array(fullResult as ArrayBuffer);
              if (fullArr.length < 30) {
                resolve(false); // För liten för att vara en giltig PDF
                return;
              }
              
              // Sök efter EOF-markör i de sista 1000 bytes av filen
              const searchSize = Math.min(1000, fullArr.length);
              const tail = new TextDecoder().decode(fullArr.slice(fullArr.length - searchSize));
              const hasEOF = tail.includes('%%EOF');
              
              // Kontrollera också efter xref-tabell
              const hasXref = tail.includes('xref');
              
              resolve(isPDF && (hasEOF || hasXref));
            } catch (error) {
              console.error('Fel vid fullständig PDF-verifiering:', error);
              resolve(isPDF); // Fall tillbaka på header-kontrollen
            }
          };
          
          fullReader.onerror = () => resolve(isPDF); // Fall tillbaka på header-kontrollen
          fullReader.readAsArrayBuffer(file);
          
        } catch (error) {
          console.error('Fel vid PDF-verifiering:', error);
          resolve(false);
        }
      };
      
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 5));
    });
  };

  const handleSubmit = async () => {
    if (files.length > 0) {
      // Visa namnet på filen som laddas upp i konsolen
      console.log("Laddar upp filer:", files.map(f => f.name));
      
      if (acceptedFileTypes.includes('pdf')) {
        // Kontrollera om filen är en giltig PDF om det är en PDF-uppladdning
        const pdfValidations = await Promise.all(files.map(verifyPDFFile));
        
        if (pdfValidations.some(isValid => !isValid)) {
          alert('En eller flera filer är inte giltiga PDF-dokument. Kontrollera filerna och försök igen.');
          return;
        }
      }
      
      // Skicka filerna till föräldrakomponenten för uppladdning
      onUpload(files);
      
      // Återställ filer och stäng dialogen
      setFiles([]);
      handleClose();
    }
  };

  const openFileSelector = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  // Hantera stängning av dialogrutan
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
  };
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-40" 
        onClick={handleClose}
      />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="absolute top-3 right-3">
          <button 
            onClick={handleClose} 
            className="rounded-full p-1 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div 
          className={`mt-6 mb-6 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-48 ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-500"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileSelector}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          
          <CloudUpload 
            size={48} 
            className={`${dragActive ? "text-blue-500" : "text-gray-400"}`}
          />
          
          <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white mt-4 w-full">
            Välj filer att ladda upp
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            eller dra och släpp filer här
          </p>
          
          {files.length > 0 && (
            <div className="mt-2 text-sm text-blue-600">
              {files.length} fil{files.length !== 1 ? "er" : ""} valda
            </div>
          )}
        </div>
        
        {files.length > 0 && (
          <div className="mt-2 mb-4">
            <h3 className="font-medium text-sm mb-2">Valda filer:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {files.map((file, index) => (
                <li key={index} className="flex items-center">
                  <FileText size={16} className="text-red-500 mr-2" />
                  <span>{file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Avbryt
          </Button>
          <Button 
            disabled={files.length === 0} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmit}
          >
            Ladda upp
          </Button>
        </div>
      </div>
    </div>
  );
}