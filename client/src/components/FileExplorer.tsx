import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, File, ChevronDown, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  selected?: boolean;
}

interface FileExplorerProps {
  onFileSelect: (file: FileNode) => void;
  selectedFileId?: string;
}

export function FileExplorer({ onFileSelect, selectedFileId }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: 'folder-1',
      name: 'Project Documentation',
      type: 'folder',
      children: [
        {
          id: 'file-1',
          name: 'Requirements.pdf',
          type: 'file',
        },
        {
          id: 'file-2',
          name: 'Architecture.pdf',
          type: 'file',
        },
        {
          id: 'folder-2',
          name: 'Design Files',
          type: 'folder',
          children: [
            {
              id: 'file-3',
              name: 'Mockups.pdf',
              type: 'file',
            }
          ]
        }
      ]
    },
    {
      id: 'folder-3',
      name: 'Meeting Notes',
      type: 'folder',
      children: []
    },
    {
      id: 'folder-4',
      name: 'Reference Materials',
      type: 'folder',
      children: []
    }
  ]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-1': true,
    'folder-2': true,
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      onFileSelect(file);
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return (
      <ul className={cn("space-y-2", level > 0 ? "pl-4 mt-2" : "")}>
        {nodes.map((node) => (
          <li key={node.id} className="mb-2">
            <div 
              className={cn(
                "flex items-center py-1 cursor-pointer",
                node.type === 'file' && selectedFileId === node.id ? "text-primary-600 font-medium" : "",
                "hover:bg-neutral-100 rounded px-1"
              )}
              onClick={() => node.type === 'folder' ? toggleFolder(node.id) : handleFileClick(node)}
            >
              {node.type === 'folder' ? (
                <>
                  {expandedFolders[node.id] ? (
                    <ChevronDown className="h-4 w-4 text-neutral-500 mr-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-500 mr-1" />
                  )}
                  <Folder className="h-4 w-4 text-neutral-500 mr-2" />
                </>
              ) : (
                <File className="h-4 w-4 text-neutral-500 mr-2" />
              )}
              <span>{node.name}</span>
            </div>
            
            {node.type === 'folder' && expandedFolders[node.id] && node.children && 
              renderFileTree(node.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <Card className="shadow-none border-0">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Files</CardTitle>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-primary-600 hover:bg-primary-50 hover:text-primary-700">
              <Plus className="h-4 w-4" />
              <span className="text-xs">New</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="bg-neutral-50 rounded-md p-4 tree-view">
            {renderFileTree(files)}
          </div>
          
          <div className="mt-4">
            <div className="p-3 bg-neutral-50 rounded-md">
              <p className="text-sm text-neutral-500 mb-3">Storage</p>
              <Progress value={72} className="h-2 mb-2" />
              <p className="text-xs text-neutral-500">7.2GB of 10GB used</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
