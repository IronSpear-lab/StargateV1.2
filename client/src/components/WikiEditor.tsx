import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WikiPage {
  id: string;
  title: string;
  isActive: boolean;
  isParent: boolean;
  children?: WikiPage[];
}

export function WikiEditor() {
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([
    {
      id: "overview",
      title: "Project Overview",
      isActive: true,
      isParent: false
    },
    {
      id: "architecture",
      title: "Technical Architecture",
      isActive: false,
      isParent: true,
      children: [
        {
          id: "frontend",
          title: "Frontend",
          isActive: false,
          isParent: false
        },
        {
          id: "backend",
          title: "Backend",
          isActive: false,
          isParent: false
        },
        {
          id: "database",
          title: "Database",
          isActive: false,
          isParent: false
        }
      ]
    },
    {
      id: "guides",
      title: "User Guides",
      isActive: false,
      isParent: false
    },
    {
      id: "api",
      title: "API Documentation",
      isActive: false,
      isParent: false
    },
    {
      id: "meetings",
      title: "Meeting Notes",
      isActive: false,
      isParent: false
    }
  ]);

  const [isEditing, setIsEditing] = useState(false);
  
  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };
  
  const setActivePage = (pageId: string) => {
    const updatePages = (pages: WikiPage[]): WikiPage[] => {
      return pages.map(page => {
        if (page.id === pageId) {
          return { ...page, isActive: true };
        } else {
          const updatedPage = { ...page, isActive: false };
          if (page.children) {
            updatedPage.children = updatePages(page.children);
          }
          return updatedPage;
        }
      });
    };
    
    setWikiPages(updatePages(wikiPages));
  };
  
  const renderWikiSidebar = (pages: WikiPage[], level = 0) => {
    return (
      <ul className={level === 0 ? "space-y-2" : "pl-4 mt-1 space-y-1"}>
        {pages.map(page => (
          <li key={page.id}>
            <a 
              href="#" 
              className={`text-sm ${page.isActive ? 'text-primary-600 hover:underline font-medium' : 'text-neutral-700 hover:text-primary-600'}`}
              onClick={(e) => {
                e.preventDefault();
                setActivePage(page.id);
              }}
            >
              {page.title}
            </a>
            {page.children && page.children.length > 0 && renderWikiSidebar(page.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Project Wiki</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="gap-1">
            <History className="h-4 w-4" />
            History
          </Button>
          <Button onClick={toggleEditing} variant={isEditing ? "default" : "outline"} className="gap-1">
            <Edit className="h-4 w-4" />
            {isEditing ? "Save" : "Edit"}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-medium">Contents</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {renderWikiSidebar(wikiPages)}
              
              <div className="mt-6">
                <Button variant="outline" className="w-full gap-1">
                  <Edit className="h-4 w-4" />
                  New Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              {isEditing ? (
                <div>
                  <input 
                    type="text" 
                    className="w-full text-xl font-bold mb-4 border-b-2 border-neutral-200 pb-2 focus:outline-none focus:border-primary-500"
                    value="Project Overview"
                  />
                  <textarea 
                    className="w-full min-h-[500px] border border-neutral-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    defaultValue={`ValvXlstart is a comprehensive project management platform designed to streamline collaboration and document workflows. This wiki serves as the central knowledge base for all project-related information.

## Key Features

- File Management System with PDF annotation and commenting
- Task and Project Management with Kanban and Gantt views
- Team Collaboration tools including wiki and real-time notifications
- Role-based access control for secure document handling

## Project Timeline

| Phase | Timeline | Status |
|-------|----------|--------|
| Research & Planning | Jan - Feb 2023 | Completed |
| Design & Prototyping | Mar - Apr 2023 | Completed |
| Development | May - Aug 2023 | In Progress |
| Testing | Sep - Oct 2023 | Not Started |
| Deployment | November 2023 | Not Started |`}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold mb-4">Project Overview</h2>
                  <p className="text-neutral-500 text-sm mb-6">
                    Last updated by John Doe on May 15, 2023
                  </p>
                  
                  <div className="prose max-w-none">
                    <p>
                      ValvXlstart is a comprehensive project management platform designed to streamline collaboration and document workflows. This wiki serves as the central knowledge base for all project-related information.
                    </p>
                    
                    <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
                    
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                      <li>File Management System with PDF annotation and commenting</li>
                      <li>Task and Project Management with Kanban and Gantt views</li>
                      <li>Team Collaboration tools including wiki and real-time notifications</li>
                      <li>Role-based access control for secure document handling</li>
                    </ul>
                    
                    <h3 className="text-lg font-semibold mt-6 mb-3">Project Timeline</h3>
                    
                    <table className="min-w-full border border-neutral-200 mb-6">
                      <thead>
                        <tr>
                          <th className="border border-neutral-200 p-2 text-left">Phase</th>
                          <th className="border border-neutral-200 p-2 text-left">Timeline</th>
                          <th className="border border-neutral-200 p-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-neutral-200 p-2">Research & Planning</td>
                          <td className="border border-neutral-200 p-2">Jan - Feb 2023</td>
                          <td className="border border-neutral-200 p-2">
                            <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs">Completed</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-neutral-200 p-2">Design & Prototyping</td>
                          <td className="border border-neutral-200 p-2">Mar - Apr 2023</td>
                          <td className="border border-neutral-200 p-2">
                            <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs">Completed</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-neutral-200 p-2">Development</td>
                          <td className="border border-neutral-200 p-2">May - Aug 2023</td>
                          <td className="border border-neutral-200 p-2">
                            <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs">In Progress</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-neutral-200 p-2">Testing</td>
                          <td className="border border-neutral-200 p-2">Sep - Oct 2023</td>
                          <td className="border border-neutral-200 p-2">
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">Not Started</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-neutral-200 p-2">Deployment</td>
                          <td className="border border-neutral-200 p-2">November 2023</td>
                          <td className="border border-neutral-200 p-2">
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">Not Started</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <h3 className="text-lg font-semibold mt-6 mb-3">Team Members</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center p-3 border border-neutral-200 rounded-md">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                          <span className="font-semibold">JD</span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">John Doe</p>
                          <p className="text-sm text-neutral-500">Project Leader</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 border border-neutral-200 rounded-md">
                        <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center text-warning-600">
                          <span className="font-semibold">AS</span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">Alex Smith</p>
                          <p className="text-sm text-neutral-500">Frontend Developer</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 border border-neutral-200 rounded-md">
                        <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center text-success-600">
                          <span className="font-semibold">MK</span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">Maria Kim</p>
                          <p className="text-sm text-neutral-500">UI/UX Designer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
