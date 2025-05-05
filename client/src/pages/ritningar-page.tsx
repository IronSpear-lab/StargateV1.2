import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileText, Search, Plus, Upload, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PDFViewer } from "@/components/PDFViewer";
import { storeFiles, getUploadedFileUrl, getStoredFile } from "@/lib/file-utils";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { UploadDialog } from "@/components/UploadDialog";
import { toast } from "@/hooks/use-toast";

const mockRitningar = [
  { 
    id: 1, 
    filename: "A-400-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 2, 
    filename: "A-400-1-100.pdf", 
    version: "2", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 3, 
    filename: "A-400-1-100.pdf", 
    version: "3", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 4, 
    filename: "A-400-1-105.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 5, 
    filename: "A-400-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 6, 
    filename: "A-401-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 11", 
    uploaded: "7 sep 2023, 10:23", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 7, 
    filename: "A-402-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 12", 
    uploaded: "7 sep 2023, 14:15", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 8, 
    filename: "A-403-1-100.pdf", 
    version: "2", 
    description: "HUS PLAN 13", 
    uploaded: "8 sep 2023, 09:12", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 9, 
    filename: "A-404-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 14", 
    uploaded: "8 sep 2023, 11:30", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 10, 
    filename: "A-405-1-100.pdf", 
    version: "3", 
    description: "HUS PLAN 15", 
    uploaded: "9 sep 2023, 08:45", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 11, 
    filename: "A-406-1-100.pdf", 
    version: "2", 
    description: "HUS SEKTION A-A", 
    uploaded: "9 sep 2023, 14:22", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 12, 
    filename: "A-407-1-100.pdf", 
    version: "1", 
    description: "HUS SEKTION B-B", 
    uploaded: "10 sep 2023, 10:15", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 13, 
    filename: "A-408-1-100.pdf", 
    version: "2", 
    description: "HUS FASAD NORR", 
    uploaded: "10 sep 2023, 15:40", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 14, 
    filename: "A-409-1-100.pdf", 
    version: "1", 
    description: "HUS FASAD SÖDER", 
    uploaded: "11 sep 2023, 09:05", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 15, 
    filename: "A-410-1-100.pdf", 
    version: "1", 
    description: "HUS FASAD ÖSTER", 
    uploaded: "11 sep 2023, 14:30", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 16, 
    filename: "A-411-1-100.pdf", 
    version: "2", 
    description: "HUS FASAD VÄSTER", 
    uploaded: "12 sep 2023, 11:20", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  }
];

// Utöka ritningarna med ett fileId-fält för att hålla reda på uppladdade filer
interface Ritning {
  id: number;
  filename: string;
  version: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  number: string;
  status: string;
  annat: string;
  fileId?: string; // Används för att hålla reda på PDF-filer för uppladdade ritningar
}

export default function RitningarPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("uploaded");
  const [sortDirection, setSortDirection] = useState("desc");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [ritningarData, setRitningarData] = useState<Ritning[]>(mockRitningar);
  const [selectedFile, setSelectedFile] = useState<{
    file: File | null;
    fileUrl?: string;
    fileData?: {
      filename: string;
      version: string;
      description: string;
      uploaded: string;
      uploadedBy: string;
    };
  } | null>(null);
  
  // I en riktig implementation skulle denna query hämta data från API:et
  // const { data: ritningar = [], isLoading } = useQuery({
  //   queryKey: ['/api/ritningar'],
  // });

  // Använder mockdata tills vidare
  const ritningar = ritningarData;
  const isLoading = false;

  const filteredRitningar = ritningar.filter(ritning => 
    ritning.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ritning.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(ritning => 
    versionFilter === "all" || ritning.version === versionFilter
  );
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleUpload = (files: File[]) => {
    // I en riktig implementering skulle vi skicka filerna till en API-endpoint
    console.log("Uppladdade filer:", files);
    
    // Lagra filerna och spara deras ID:n för senare användning
    const fileIds = storeFiles(files);
    
    // Lägg till de uppladdade filerna i listan
    const now = new Date();
    const timeString = `${now.getDate()} ${['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][now.getMonth()]} ${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newRitningar = files.map((file, index) => ({
      id: ritningarData.length + index + 1,
      filename: file.name,
      version: "1", // Ny fil får version 1
      description: "Ny uppladdad fil", 
      uploaded: timeString,
      uploadedBy: "Du",
      number: `${ritningarData.length + index + 1}`.padStart(3, '0'),
      status: "Active",
      annat: "PDF",
      fileId: fileIds[index] // Spara ID:t från fillagringen
    }));
    
    // Uppdatera listan med ritningar
    setRitningarData([...newRitningar, ...ritningarData]);
    
    // Visa bekräftelse
    setTimeout(() => {
      toast({
        title: "Filer uppladdade",
        description: `${files.length} fil(er) har laddats upp framgångsrikt.`,
        variant: "default",
      });
    }, 300);
  };
  
  // Öppna PDF-visaren när användaren klickar på en fil
  const handleFileClick = (ritning: Ritning) => {
    // För uppladdade filer, använd den lagrade filen
    if (ritning.fileId && ritning.fileId.startsWith('file_')) {
      const storedFileData = getStoredFile(ritning.fileId);
      if (storedFileData) {
        setSelectedFile({
          file: storedFileData.file,
          fileUrl: storedFileData.url,
          fileData: {
            filename: ritning.filename,
            version: ritning.version,
            description: ritning.description,
            uploaded: ritning.uploaded,
            uploadedBy: ritning.uploadedBy
          }
        });
        return;
      }
    }
    
    // För befintliga/mock-filer, använd exempelfilen
    const fileUrl = getUploadedFileUrl(ritning.id);
    setSelectedFile({
      file: null,
      fileUrl,
      fileData: {
        filename: ritning.filename,
        version: ritning.version,
        description: ritning.description,
        uploaded: ritning.uploaded,
        uploadedBy: ritning.uploadedBy
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 overflow-y-auto">
        <Header title="Ritningar" onToggleSidebar={toggleSidebar} />
        
        <div className="container px-6 py-6">
          <div className="flex items-center text-sm mb-4 text-blue-600">
            <Home size={14} className="mr-1" />
            <span>Vault</span>
            <ChevronRight size={14} className="mx-1" />
            <span>Files</span>
            <ChevronRight size={14} className="mx-1" />
            <span>01- Organisation</span>
            <ChevronRight size={14} className="mx-1" />
            <span>01- Arkitekt</span>
            <ChevronRight size={14} className="mx-1" />
            <span className="font-semibold">Ritningar</span>
          </div>
        
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Ritningar</h1>
            <div className="flex space-x-2">
              <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50">
                <Plus className="mr-2 h-4 w-4" />
                Add Folder
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              
              {/* Upload Dialog */}
              <UploadDialog 
                isOpen={showUploadDialog} 
                onClose={() => setShowUploadDialog(false)}
                onUpload={handleUpload}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">Sök efter ritningar</h2>
              <div className="mt-2 flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Sök..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <div className="w-32">
                    <Select
                      value={sortField}
                      onValueChange={setSortField}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sortera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uploaded">Uppladdad</SelectItem>
                        <SelectItem value="filename">Filnamn</SelectItem>
                        <SelectItem value="version">Version</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Select
                      value={versionFilter}
                      onValueChange={setVersionFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="A-O" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla versioner</SelectItem>
                        <SelectItem value="1">Version 1</SelectItem>
                        <SelectItem value="2">Version 2</SelectItem>
                        <SelectItem value="3">Version 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Select defaultValue="newest">
                      <SelectTrigger>
                        <SelectValue placeholder="Nyast först" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nyast först</SelectItem>
                        <SelectItem value="oldest">Äldst först</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Filnamn</TableHead>
                    <TableHead className="w-[80px]">Version</TableHead>
                    <TableHead className="w-[200px]">Innehållsbeskrivning</TableHead>
                    <TableHead className="w-[140px]">Uppladdad</TableHead>
                    <TableHead className="w-[160px]">Uppladdad av</TableHead>
                    <TableHead className="w-[100px]">Nummer</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px]">Annat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Laddar...</TableCell>
                    </TableRow>
                  ) : filteredRitningar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Inga ritningar hittades</TableCell>
                    </TableRow>
                  ) : (
                    filteredRitningar.map((ritning) => (
                      <TableRow key={ritning.id}>
                        <TableCell className="py-2 w-[200px]">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3 text-red-500">
                              <FileText size={20} />
                            </div>
                            <div 
                              className="text-sm text-blue-600 hover:underline cursor-pointer whitespace-nowrap"
                              onClick={() => handleFileClick(ritning)}
                            >
                              {ritning.filename}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px]">{ritning.version}</TableCell>
                        <TableCell className="w-[200px]">{ritning.description}</TableCell>
                        <TableCell className="w-[140px]">{ritning.uploaded}</TableCell>
                        <TableCell className="w-[160px]">{ritning.uploadedBy}</TableCell>
                        <TableCell className="w-[100px]">{ritning.number}</TableCell>
                        <TableCell className="w-[120px]">{ritning.status}</TableCell>
                        <TableCell className="w-[120px]">{ritning.annat}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      
      {/* PDF-visare */}
      {selectedFile && (
        <PDFViewer
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          file={selectedFile.file}
          fileUrl={selectedFile.fileUrl}
          fileData={selectedFile.fileData}
        />
      )}
    </div>
  );
}