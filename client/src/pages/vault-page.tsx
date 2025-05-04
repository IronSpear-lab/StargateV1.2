import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { format } from "date-fns";

// Sample data for inbox comments
const inboxComments = [
  { id: 1, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 2, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 3, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 4, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 5, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 6, code: "839", date: new Date(2023, 1, 3), color: "red" },
  { id: 7, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 8, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 9, code: "854", date: new Date(2023, 1, 3), color: "blue" },
  { id: 10, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 11, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 12, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 13, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 14, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 15, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 16, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 17, code: "900", date: new Date(2023, 1, 3), color: "green" }
];

// Sample data for recent files
const recentFiles = [
  { id: 1, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 2, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 3, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 4, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 5, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 6, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 7, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 8, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 9, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 10, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 11, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 12, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 13, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 14, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 15, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 16, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 17, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" }
];

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState("home");

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-5 h-5 mr-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15h6M9 18h6M9 12h2" />
            </svg>
          </div>
        );
      case 'zip':
        return (
          <div className="w-5 h-5 mr-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-500">
              <path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9"></path>
              <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <polyline points="10 12 12 14 14 12"></polyline>
            </svg>
          </div>
        );
      default:
        return <FileText className="w-5 h-5 mr-2 text-blue-500" />;
    }
  };

  const getCommentStatusColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'blue':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <nav className="flex mb-4 text-sm" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-2">
                <li className="inline-flex items-center">
                  <a href="#" className="inline-flex items-center text-gray-500 hover:text-blue-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                    Home
                  </a>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <a href="#" className="ml-1 text-blue-500 hover:text-blue-700 md:ml-2">Vault</a>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="text-2xl font-semibold text-gray-900">Vault</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inbox Comments Section */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <span>Inbox Comments</span>
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                    4
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t border-gray-200">
                  {inboxComments.slice(0, 15).map((comment) => (
                    <div 
                      key={comment.id} 
                      className="flex items-center justify-between py-2 px-4 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-sm ${getCommentStatusColor(comment.color)} mr-4`} />
                        <span className="text-sm font-medium text-gray-700">{comment.code}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(comment.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2 pb-2">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 text-xs flex items-center">
                  View All <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Files Section */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Recent files</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t border-gray-200">
                  {recentFiles.slice(0, 15).map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between py-2 px-4 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex items-center overflow-hidden">
                        {getFileIcon(file.type)}
                        <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {format(file.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2 pb-2">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 text-xs flex items-center">
                  View All <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}