import React from 'react';
import { XCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const formErrorVariants = cva(
  "flex items-center gap-2 text-destructive text-sm px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20",
  {
    variants: {
      variant: {
        default: "",
        critical: "bg-destructive/15 border-destructive/30 font-medium",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface FormErrorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formErrorVariants> {
  icon?: React.ReactNode;
  title?: string;
  message: string;
}

export function FormError({
  className,
  variant,
  size,
  icon,
  title,
  message,
  ...props
}: FormErrorProps) {
  return (
    <div
      className={cn(formErrorVariants({ variant, size }), className)}
      {...props}
    >
      {icon || <XCircle className="h-4 w-4 shrink-0" />}
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
}