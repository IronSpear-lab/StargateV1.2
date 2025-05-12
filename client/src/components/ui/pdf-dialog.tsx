import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const PDFDialog = DialogPrimitive.Root

const PDFDialogTrigger = DialogPrimitive.Trigger

const PDFDialogPortal = DialogPrimitive.Portal

const PDFDialogClose = DialogPrimitive.Close

// Vi modifierar overlay för att ha en mer transparent bakgrund
const PDFDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
PDFDialogOverlay.displayName = "PDFDialogOverlay"

// Vi modifierar content för PDF-viewers
const PDFDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideCloseButton?: boolean;
  }
>(({ className, children, hideCloseButton = false, ...props }, ref) => (
  <PDFDialogPortal>
    <PDFDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg p-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <PDFDialogClose className="absolute right-4 top-4 rounded-sm ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50 bg-background/90 p-1.5">
          <X className="h-5 w-5 text-primary" />
          <span className="sr-only">Stäng</span>
        </PDFDialogClose>
      )}
    </DialogPrimitive.Content>
  </PDFDialogPortal>
))
PDFDialogContent.displayName = "PDFDialogContent"

export {
  PDFDialog,
  PDFDialogPortal,
  PDFDialogOverlay,
  PDFDialogClose,
  PDFDialogTrigger,
  PDFDialogContent,
}