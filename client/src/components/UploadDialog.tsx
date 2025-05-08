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
  open: isOpen, 
  onOpenChange: onClose, 
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

  const handleSubmit = () => {
    if (files.length > 0) {
      // Visa namnet på filen som laddas upp i konsolen
      console.log("Laddar upp filer:", files.map(f => f.name));
      
      // Skicka filerna till föräldrakomponenten för uppladdning
      onUpload(files);
      
      // Återställ filer och stäng dialogen
      setFiles([]);
      onClose();
    }
  };

  const openFileSelector = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-40" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="absolute top-3 right-3">
          <button 
            onClick={onClose} 
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
          
          <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-4 w-full">
            Choose files to upload
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            or drag and drop them here
          </p>
          
          {files.length > 0 && (
            <div className="mt-2 text-sm text-blue-600">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            disabled={files.length === 0} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmit}
          >
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}