import { ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WidgetAreaProps {
  children: ReactNode;
  className?: string;
  onWidgetPositionChange?: (sourceId: string, targetId: string) => void;
}

export function WidgetArea({ children, className, onWidgetPositionChange }: WidgetAreaProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const { toast } = useToast();
  
  // Track drag/drop operations
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(true);
  };
  
  const handleDragLeave = () => {
    setDropzoneActive(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(false);
    
    // Extract dropped widget data
    const widgetId = e.dataTransfer.getData("widget-id");
    const widgetType = e.dataTransfer.getData("widget-type");
    
    if (!widgetId || !widgetType) {
      return;
    }
    
    // Get position of drop 
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate drop position
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find widget nearest to the drop
    const nearestWidget = findNearestWidget(x, y);
    
    if (nearestWidget && onWidgetPositionChange) {
      onWidgetPositionChange(widgetId, nearestWidget);
      toast({
        title: "Widget omplacerad",
        description: "Widgetens position har uppdaterats",
        variant: "default",
      });
    }
  };
  
  // Find the nearest widget element to the drop position
  const findNearestWidget = (x: number, y: number) => {
    if (!areaRef.current) return null;
    
    // Get all widget elements
    const widgets = areaRef.current.querySelectorAll('.widget');
    let nearestWidget = null;
    let minDistance = Infinity;
    
    widgets.forEach((widget) => {
      const widgetRect = widget.getBoundingClientRect();
      const areaRect = areaRef.current!.getBoundingClientRect();
      
      // Calculate widget center relative to the widget area
      const widgetCenterX = (widgetRect.left + widgetRect.right) / 2 - areaRect.left;
      const widgetCenterY = (widgetRect.top + widgetRect.bottom) / 2 - areaRect.top;
      
      // Calculate distance from drop position to widget center
      const distance = Math.sqrt(
        Math.pow(x - widgetCenterX, 2) + Math.pow(y - widgetCenterY, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestWidget = widget.id.replace('widget-', '');
      }
    });
    
    return nearestWidget;
  };
  
  return (
    <div
      ref={areaRef}
      className={cn(
        "grid grid-cols-12 gap-4 p-4 relative rounded-lg overflow-hidden",
        dropzoneActive && "border-2 border-dashed border-primary/30 shadow-lg",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(135deg, var(--background) 0%, var(--primary)/0.03 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        boxShadow: "inset 0 0 30px rgba(var(--primary-rgb)/0.03)"
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Futuristisk dekorativ overlay */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: "radial-gradient(circle at 20% 20%, var(--primary)/0.03 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--primary)/0.05 0%, transparent 40%)",
          backdropFilter: "blur(40px)",
          opacity: 0.8
        }}
      />
      
      {/* Subtil linjemönster som bakgrund */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "linear-gradient(to right, var(--primary)/0.1 1px, transparent 1px), linear-gradient(to bottom, var(--primary)/0.1 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />
      
      {/* Widget content */}
      <div className="col-span-12 grid grid-cols-12 gap-4 relative z-10">
        {children}
      </div>
    </div>
  );
}