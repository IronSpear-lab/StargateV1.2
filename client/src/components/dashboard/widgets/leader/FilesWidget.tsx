import { useState } from "react";
import { 
  FileText, 
  Download,
  File,
  Search,
  Calendar,
  ArrowUpRight,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";

interface FileItem {
  id: number;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  versionId?: number;
}

export default function FilesWidget({ title = "Filer" }) {
  const { currentProject } = useProject();
  const { showPDFDialog } = usePDFDialog();
  
  // Exempel på mock-data för filer
  const mockFiles: FileItem[] = [
    { id: 1, name: "Huvudritning_Rev2.pdf", type: "pdf", size: 4250000, uploadedBy: "Anna Andersson", uploadedAt: "2025-05-11T09:30:00", versionId: 101 },
    { id: 2, name: "Konstruktionsberäkningar.xlsx", type: "xlsx", size: 1850000, uploadedBy: "Erik Eriksson", uploadedAt: "2025-05-10T14:15:00" },
    { id: 3, name: "Fasadritningar.pdf", type: "pdf", size: 3750000, uploadedBy: "Maria Svensson", uploadedAt: "2025-05-09T11:45:00", versionId: 102 },
    { id: 4, name: "Projektplan.docx", type: "docx", size: 980000, uploadedBy: "Johan Lindgren", uploadedAt: "2025-05-08T16:20:00" },
    { id: 5, name: "Elritningar.pdf", type: "pdf", size: 2650000, uploadedBy: "Anders Nilsson", uploadedAt: "2025-05-07T13:10:00", versionId: 103 },
  ];

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: files = mockFiles, isLoading } = useQuery<FileItem[]>({
    queryKey: ['/api/files/recent'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/files/recent');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockFiles;
      } catch (error) {
        console.error('Error fetching files:', error);
        return mockFiles;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  // Formatera filstorlek till läsbart format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };
  
  // Formatera datum till svenskt format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Ikoner för olika filtyper
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  // Hantera visning av PDF
  const handleViewPDF = (versionId: number) => {
    showPDFDialog({ versionId });
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar fildata...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Inga filer hittades</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Senast uppladdade filer</h3>
                
                <div className="overflow-hidden border rounded-lg">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Filnamn
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                          Storlek
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Uppladdad
                        </th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Åtgärd
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {files.slice(0, 5).map((file) => (
                        <tr key={file.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getFileIcon(file.type)}
                              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{formatDate(file.uploadedAt)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            {file.type.toLowerCase() === 'pdf' && file.versionId ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewPDF(file.versionId!)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs">Visa</span>
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs">Ladda ner</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Sök filer
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  Visa alla filer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Widget>
  );
}