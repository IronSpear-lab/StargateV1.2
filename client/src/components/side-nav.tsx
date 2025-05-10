import { Link, useLocation } from "wouter";
import {
  Calendar,
  FileText,
  Folder,
  GanttChartSquare,
  Layers,
  MessageSquare,
  TimerIcon,
  LayoutGrid,
  Settings,
  Clock,
  Info,
  FileQuestion,
  FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SideNavProps {
  projectId: number;
  projectName: string;
}

export function SideNav({ projectId, projectName }: SideNavProps) {
  const [location] = useLocation();
  const isMobile = useMobile();

  // Genväg till projektsidan
  const projectPath = `/projects/${projectId}`;

  return (
    <div className="h-full py-4 md:py-6">
      {!isMobile && (
        <div className="px-3 py-2 mb-6">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {projectName}
          </h2>
          <div className="space-y-1">
            <Button
              variant="secondary"
              asChild
              className="w-full justify-start"
            >
              <Link href={projectPath}>
                <FileText className="mr-2 h-4 w-4" />
                Projektöversikt
              </Link>
            </Button>
          </div>
        </div>
      )}
      
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="space-y-4 py-2">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-medium text-muted-foreground">
              Dokumenter
            </h2>
            <div className="space-y-1">
              <Button
                asChild
                variant={location === `${projectPath}/files` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/files`}>
                  <Folder className="mr-2 h-4 w-4" />
                  Filer
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/viewer` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/viewer`}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  3D Viewer
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-medium text-muted-foreground">
              Planering
            </h2>
            <div className="space-y-1">
              <Button
                asChild
                variant={location === `${projectPath}/kanban` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/kanban`}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Kanban Board
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/gantt` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/gantt`}>
                  <GanttChartSquare className="mr-2 h-4 w-4" />
                  Gantt Chart
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/calendar` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/calendar`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Kalender
                </Link>
              </Button>
              <Button
                asChild
                variant={location.includes(`/time-tracking`) ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`/time-tracking/${projectId}`}>
                  <Clock className="mr-2 h-4 w-4" />
                  Tidsrapportering
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `/month-calendar` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href="/month-calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Månadskalender
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-medium text-muted-foreground">
              Kommunikation
            </h2>
            <div className="space-y-1">
              <Button
                asChild
                variant={location === `${projectPath}/chat` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/chat`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Meddelanden
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/wiki` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/wiki`}>
                  <FileQuestion className="mr-2 h-4 w-4" />
                  Wiki
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-medium text-muted-foreground">
              Administration
            </h2>
            <div className="space-y-1">
              <Button
                asChild
                variant={location === `${projectPath}/members` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/members`}>
                  <Layers className="mr-2 h-4 w-4" />
                  Medlemmar
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/settings` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Inställningar
                </Link>
              </Button>
              <Button
                asChild
                variant={location === `${projectPath}/about` ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={`${projectPath}/about`}>
                  <Info className="mr-2 h-4 w-4" />
                  Om projektet
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}