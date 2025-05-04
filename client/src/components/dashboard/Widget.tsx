import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grip, X, ChevronDown, ChevronUp, MoreHorizontal, Maximize2, Minimize2 } from "lucide-react";
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
  noPadding?: boolean;
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
  width = "half",
  height = "medium",
  noPadding = false,
}: WidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
    if (collapsed) setCollapsed(false);
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    if (expanded) setExpanded(false);
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
    medium: collapsed ? "h-[42px]" : "h-[320px]",
    large: "h-[500px]",
    auto: "h-auto",
  }[height] || "h-[320px]";

  return (
    <Card
      id={`widget-${id}`}
      className={cn(
        expanded ? "fixed inset-6 z-50" : widthClasses,
        "shadow-sm rounded-lg transition-all duration-200 widget border-0",
        dragging ? "opacity-50" : "opacity-100",
        className
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="p-3 bg-white border-b flex-row items-center justify-between space-y-0 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div
            className="cursor-move p-1 rounded hover:bg-neutral-100"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Grip className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs text-gray-500">{description}</CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full hover:bg-gray-100" 
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
            )}
          </Button>
          
          {!expanded ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-gray-100" 
              onClick={toggleExpanded}
            >
              <Maximize2 className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-gray-100" 
              onClick={toggleExpanded}
            >
              <Minimize2 className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-gray-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
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
            className="h-6 w-6 rounded-full hover:bg-gray-100"
            onClick={() => onRemove(id)}
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          noPadding ? "p-0" : "p-3", 
          "overflow-auto bg-white rounded-b-lg",
          !expanded && heightClasses, 
          collapsed && "hidden", 
          "relative"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}