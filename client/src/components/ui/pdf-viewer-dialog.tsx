import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function PDFViewerDialog({
  open,
  onOpenChange,
  url,
  title,
}: PDFViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  // Reset scale when URL changes
  useEffect(() => {
    setScale(1);
    setLoading(true);
  }, [url]);

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  // Force a max height for the iframe and make it scrollable
  const iframeStyle = {
    width: "100%",
    height: "75vh",
    border: "none",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    transition: "transform 0.2s ease",
  };

  const containerStyle = {
    overflow: "auto",
    maxHeight: "75vh",
    width: "100%",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span className="truncate max-w-md">{title}</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        <div style={containerStyle}>
          <iframe
            src={url}
            style={iframeStyle}
            onLoad={() => setLoading(false)}
            className={loading ? "hidden" : ""}
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}