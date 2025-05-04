import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileText, Search, Plus, Upload } from "lucide-react";
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
    id: 7, 
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
    id: 8, 
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
    id: 9, 
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
    id: 10, 
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
    id: 11, 
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
    id: 12, 
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
    id: 13, 
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
    id: 14, 
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
    id: 15, 
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
    id: 16, 
    filename: "A-400-1-100.pdf", 
    version: "2", 
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Ritningar</h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="border-primary-500 text-primary-700 hover:bg-primary-50">
            <Plus className="mr-2 h-4 w-4" />
            Add Folder
          </Button>
          <Button variant="default" className="bg-primary-600 hover:bg-primary-700 text-white">
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
                <Select defaultValue="subject">
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
  );
}