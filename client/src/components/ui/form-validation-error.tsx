import React from 'react';
import { FormError } from './form-error';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { ValidationResult } from '@/hooks/use-form-validation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FormValidationErrorProps {
  validationResult: ValidationResult;
  className?: string;
  displayMode?: 'inline' | 'alert' | 'minimal';
  showAllErrors?: boolean;
}

export function FormValidationError({
  validationResult,
  className,
  displayMode = 'inline',
  showAllErrors = false
}: FormValidationErrorProps) {
  if (!validationResult.hasErrors) {
    return null;
  }

  // Get error count
  const totalFieldErrors = Object.values(validationResult.fieldErrors)
    .reduce((sum, errors) => sum + errors.length, 0);
  
  // Determine severity
  const hasCriticalErrors = totalFieldErrors > 3;
  
  // Get appropriate icon
  const getIcon = () => {
    if (hasCriticalErrors) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (totalFieldErrors > 1) {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  };

  // Get first error message or the general error message
  const mainErrorMessage = validationResult.errorMessage || 
    Object.values(validationResult.fieldErrors)[0]?.[0] || 
    'Please fix the errors in the form';

  // For showing all field errors
  const allErrorMessages = showAllErrors 
    ? Object.entries(validationResult.fieldErrors).map(([field, errors]) => ({
        field,
        message: errors[0] // Just show first error message per field
      }))
    : [];

  // Inline display (default)
  if (displayMode === 'inline') {
    return (
      <FormError
        className={cn("mb-4", className)}
        variant={hasCriticalErrors ? "critical" : "default"}
        icon={getIcon()}
        message={mainErrorMessage}
      />
    );
  }

  // Alert display (for more prominent errors)
  if (displayMode === 'alert') {
    return (
      <Alert 
        variant="destructive" 
        className={cn("mb-4", className)}
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {mainErrorMessage}
          {showAllErrors && allErrorMessages.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {allErrorMessages.map((err, idx) => (
                <li key={idx}>
                  <strong>{err.field}:</strong> {err.message}
                </li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Minimal display (just text, no styling)
  return (
    <p className={cn("text-destructive text-sm mb-2", className)}>
      {mainErrorMessage}
    </p>
  );
}