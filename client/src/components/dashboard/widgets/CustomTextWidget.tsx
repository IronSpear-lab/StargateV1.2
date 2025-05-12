import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CustomTextWidgetProps {
  id: string;
}

export function CustomTextWidget({ id }: CustomTextWidgetProps) {
  const [text, setText] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Load saved text from localStorage on first render
  useEffect(() => {
    const savedText = localStorage.getItem(`widget-${id}-text`);
    const savedTime = localStorage.getItem(`widget-${id}-saved-at`);
    
    if (savedText) {
      setText(savedText);
    }
    
    if (savedTime) {
      setLastSaved(savedTime);
    }
  }, [id]);
  
  const handleSave = () => {
    const now = new Date();
    const formattedTime = format(now, "dd MMM yyyy, HH:mm");
    
    localStorage.setItem(`widget-${id}-text`, text);
    localStorage.setItem(`widget-${id}-saved-at`, formattedTime);
    
    setLastSaved(formattedTime);
    setIsEditing(false);
  };
  
  return (
    <div className="h-full flex flex-col">
      {isEditing ? (
        <div className="flex-1 flex flex-col">
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="Click to edit..."
            className="flex-1 resize-none text-sm focus-visible:ring-1 focus-visible:ring-blue-400 border-blue-100"
          />
          <div className="flex justify-end mt-3 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div 
            className={cn(
              "flex-1 p-3 text-sm bg-gray-50 rounded cursor-pointer text-gray-500",
              !text && "text-gray-400 italic"
            )}
            onClick={() => setIsEditing(true)}
          >
            {text || "Click to edit..."}
          </div>
          <div className="flex justify-between items-center mt-3">
            {lastSaved ? (
              <div className="text-xs text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Last saved: {lastSaved}
              </div>
            ) : (
              <div></div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 text-xs text-blue-600"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}