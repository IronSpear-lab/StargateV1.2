import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grip, X, Settings, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WidgetProps {
  id: string;
  title: string;
  description?: string;
  type: string;
  children: ReactNode;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
  className?: string;
  width?: string; // "full", "half", "third"
  height?: string; // "small", "medium", "large"
}

export function Widget({
  id,
  title,
  description,
  type,
  children,
  onRemove,
  onEdit,
  className,
  width = "full",
  height = "medium",
}: WidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("widget-id", id);
    e.dataTransfer.setData("widget-type", type);
    setDragging(true);
    // Add a small delay to ensure the drag image is set
    setTimeout(() => {
      const dragImage = document.getElementById(`widget-${id}`);
      if (dragImage) {
        dragImage.style.opacity = "0.4";
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDragging(false);
    const dragImage = document.getElementById(`widget-${id}`);
    if (dragImage) {
      dragImage.style.opacity = "1";
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Determine widget size classes
  const widthClasses = {
    full: "col-span-12",
    half: "col-span-12 md:col-span-6",
    third: "col-span-12 md:col-span-4",
    quarter: "col-span-12 md:col-span-3",
  }[width] || "col-span-12";

  const heightClasses = {
    small: "h-[200px]",
    medium: "h-[360px]",
    large: "h-[500px]",
    auto: "h-auto",
  }[height] || "h-[360px]";

  return (
    <Card
      id={`widget-${id}`}
      className={cn(
        expanded ? "fixed inset-6 z-50" : widthClasses,
        "shadow-md transition-all duration-200 widget",
        dragging ? "opacity-50" : "opacity-100",
        className
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="p-3 bg-neutral-50 border-b flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <div
            className="cursor-move p-1 rounded hover:bg-neutral-100"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Grip className="h-4 w-4 text-neutral-500" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {!expanded ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleExpanded}>
              <Maximize className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleExpanded}>
              <Minimize className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5 text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  Edit widget
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => window.localStorage.setItem(`widget-${id}-position`, JSON.stringify({ width, height }))}
              >
                Save position
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleExpanded}>
                {expanded ? "Collapse" : "Expand"}
              </DropdownMenuItem>
              <DropdownMenuItem>Refresh data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onRemove(id)}
              >
                Remove widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(id)}
          >
            <X className="h-3.5 w-3.5 text-neutral-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "p-3 overflow-auto",
        !expanded && heightClasses, 
        "relative"
      )}>
        {children}
      </CardContent>
    </Card>
  );
}