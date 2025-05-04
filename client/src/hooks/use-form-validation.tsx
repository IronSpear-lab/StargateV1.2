import { useState, useEffect } from 'react';
import { FieldValues, UseFormReturn, FieldErrors } from 'react-hook-form';
import { ZodError } from 'zod';

export interface ValidationResult {
  hasErrors: boolean;
  errorMessage: string | null;
  fieldErrors: Record<string, string[]>;
}

export function useFormValidation<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any
>(form: UseFormReturn<TFieldValues, TContext>) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    hasErrors: false,
    errorMessage: null,
    fieldErrors: {},
  });

  // Watch for form errors
  useEffect(() => {
    const errors = form.formState.errors;
    
    if (Object.keys(errors).length > 0) {
      // Process field errors
      const fieldErrors: Record<string, string[]> = {};
      
      Object.entries(errors).forEach(([fieldName, error]) => {
        if (error && error.message) {
          if (!fieldErrors[fieldName]) {
            fieldErrors[fieldName] = [];
          }
          fieldErrors[fieldName].push(error.message as string);
        }
      });
      
      setValidationResult({
        hasErrors: true,
        errorMessage: "Please fix the errors in the form",
        fieldErrors,
      });
    } else {
      setValidationResult({
        hasErrors: false,
        errorMessage: null,
        fieldErrors: {},
      });
    }
    
  }, [form.formState.errors]);

  // Function to handle API validation errors
  const handleValidationErrors = (error: unknown) => {
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      const fieldErrors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const field = err.path.join('.') || 'form';
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(err.message);
      });
      
      setValidationResult({
        hasErrors: true,
        errorMessage: "Validation failed. Please check the form for errors.",
        fieldErrors,
      });
      
      // Set field errors in the form
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        if (field !== 'form') {
          form.setError(field as any, { 
            type: 'manual', 
            message: messages[0] 
          });
        }
      });
      
      return true;
    } else if (error instanceof Error) {
      // Handle generic errors
      setValidationResult({
        hasErrors: true,
        errorMessage: error.message || "An error occurred",
        fieldErrors: {},
      });
      return true;
    }
    
    return false;
  };

  return {
    validationResult,
    handleValidationErrors,
    clearErrors: () => {
      form.clearErrors();
      setValidationResult({
        hasErrors: false,
        errorMessage: null,
        fieldErrors: {},
      });
    }
  };
}