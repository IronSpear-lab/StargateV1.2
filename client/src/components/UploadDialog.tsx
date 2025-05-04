import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Upload, CloudUpload } from "lucide-react";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

export function UploadDialog({ isOpen, onClose, onUpload }: UploadDialogProps) {
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
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = () => {
    if (files.length > 0) {
      onUpload(files);
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
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            disabled={files.length === 0} 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
          >
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}