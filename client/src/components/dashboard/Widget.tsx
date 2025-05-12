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

// Define the width and height types at the module level
export type WidthType = "full" | "half" | "third" | "quarter";
export type HeightType = "small" | "medium" | "large" | "auto";

interface WidgetProps {
  id: string;
  title: string;
  description?: string;
  type: string;
  children: ReactNode;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
  className?: string;
  width?: WidthType;
  height?: HeightType;
  noPadding?: boolean;
  onResize?: (id: string, newWidth: WidthType, newHeight: HeightType) => void;
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
  onResize,
}: WidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Initialize with stored size or props
  const [currentWidth, setCurrentWidth] = useState(() => {
    const storedSize = window.localStorage.getItem(`widget-${id}-size`);
    if (storedSize) {
      try {
        const { width: storedWidth } = JSON.parse(storedSize);
        return storedWidth || width;
      } catch (e) {
        return width;
      }
    }
    return width;
  });
  
  const [currentHeight, setCurrentHeight] = useState(() => {
    const storedSize = window.localStorage.getItem(`widget-${id}-size`);
    if (storedSize) {
      try {
        const { height: storedHeight } = JSON.parse(storedSize);
        return storedHeight || height;
      } catch (e) {
        return height;
      }
    }
    return height;
  });

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

  // Safely type the current values
  const safeWidth = (currentWidth as WidthType) || "half";
  const safeHeight = (currentHeight as HeightType) || "medium";
  
  // Determine widget size classes
  const widthClasses = {
    full: "col-span-12",
    half: "col-span-12 md:col-span-6",
    third: "col-span-12 md:col-span-4",
    quarter: "col-span-12 md:col-span-3",
  }[safeWidth] || "col-span-12";

  const heightClasses = {
    small: collapsed ? "h-[42px]" : "h-[200px]",
    medium: collapsed ? "h-[42px]" : "h-[320px]",
    large: collapsed ? "h-[42px]" : "h-[500px]",
    auto: collapsed ? "h-[42px]" : "h-auto",
  }[safeHeight] || "h-[320px]";
  
  // Handle resize
  const handleResize = (newWidth: WidthType, newHeight: HeightType) => {
    setCurrentWidth(newWidth);
    setCurrentHeight(newHeight);
    
    if (onResize) {
      onResize(id, newWidth, newHeight);
    }
    
    // Save in localStorage to persist across refreshes
    window.localStorage.setItem(`widget-${id}-size`, JSON.stringify({ 
      width: newWidth, 
      height: newHeight 
    }));
  };

  return (
    <Card
      id={`widget-${id}`}
      className={cn(
        expanded ? "fixed inset-6 z-50" : widthClasses,
        "shadow-md rounded-lg transition-all duration-300 widget border-0",
        dragging ? "opacity-50" : "opacity-100",
        expanded && "backdrop-blur-sm",
        "bg-gray-100 dark:bg-gray-800 p-3", // Gråare bakgrund för 3D-effekt 
        className
      )}
      style={{
        boxShadow: expanded ? "0 8px 30px rgba(0, 0, 0, 0.12)" : "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="p-3 bg-white dark:bg-gray-700 flex-row items-center justify-between space-y-0 rounded-lg mb-2 shadow-sm">
        <div className="flex items-center space-x-2">
          <div
            className="cursor-move p-1 rounded hover:bg-primary/10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Grip className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs text-gray-500 dark:text-gray-400">{description}</CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full hover:bg-primary/10" 
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-primary" />
            )}
          </Button>
          
          {!expanded ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-primary/10" 
              onClick={toggleExpanded}
            >
              <Maximize2 className="h-3.5 w-3.5 text-primary" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-primary/10" 
              onClick={toggleExpanded}
            >
              <Minimize2 className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-primary/10"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  Edit widget
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleExpanded}>
                {expanded ? "Collapse" : "Expand"}
              </DropdownMenuItem>
              
              {/* Widget Width Submenu */}
              <DropdownMenuItem className="font-semibold">
                Set Width:
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize("full" as WidthType, safeHeight)}>
                Full Width
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize("half" as WidthType, safeHeight)}>
                Half Width
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize("third" as WidthType, safeHeight)}>
                Third Width
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize("quarter" as WidthType, safeHeight)}>
                Quarter Width
              </DropdownMenuItem>
              
              {/* Widget Height Submenu */}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-semibold">
                Set Height:
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize(safeWidth, "small" as HeightType)}>
                Small Height
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize(safeWidth, "medium" as HeightType)}>
                Medium Height
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize(safeWidth, "large" as HeightType)}>
                Large Height
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResize(safeWidth, "auto" as HeightType)}>
                Auto Height
              </DropdownMenuItem>
              
              <DropdownMenuItem>Refresh data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemove(id)}
              >
                Remove widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-destructive/10"
            onClick={() => onRemove(id)}
          >
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          noPadding ? "p-0" : "p-3", 
          "overflow-auto bg-white dark:bg-gray-700 rounded-lg",
          !expanded && heightClasses, 
          collapsed && "hidden", 
          "relative shadow-sm"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}