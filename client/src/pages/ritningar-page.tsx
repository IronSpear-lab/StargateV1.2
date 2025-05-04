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
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

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
  }
];

export default function RitningarPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("uploaded");
  const [sortDirection, setSortDirection] = useState("desc");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // I en riktig implementation skulle denna query hämta data från API:et
  // const { data: ritningar = [], isLoading } = useQuery({
  //   queryKey: ['/api/ritningar'],
  // });

  // Använder mockdata tills vidare
  const ritningar = mockRitningar;
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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
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
                    <TableHead>Filnamn</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Innehållsbeskrivning</TableHead>
                    <TableHead>Uppladdad</TableHead>
                    <TableHead>Uppladdad av</TableHead>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Annat</TableHead>
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
                        <TableCell className="py-2">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3 text-red-500">
                              <FileText size={20} />
                            </div>
                            <div className="text-sm text-blue-600 hover:underline cursor-pointer">
                              {ritning.filename}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{ritning.version}</TableCell>
                        <TableCell>{ritning.description}</TableCell>
                        <TableCell>{ritning.uploaded}</TableCell>
                        <TableCell>{ritning.uploadedBy}</TableCell>
                        <TableCell>{ritning.number}</TableCell>
                        <TableCell>{ritning.status}</TableCell>
                        <TableCell>{ritning.annat}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}