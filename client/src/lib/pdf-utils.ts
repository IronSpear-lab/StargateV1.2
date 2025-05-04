// This file contains utility functions for PDF handling

// Function to check if a filename is a PDF
export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

// Types of annotations
export enum AnnotationType {
  HIGHLIGHT = 'highlight',
  UNDERLINE = 'underline',
  STRIKEOUT = 'strikeout',
  NOTE = 'note',
  DRAWING = 'drawing'
}

// Interface for annotation data
export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  rect: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  color: string;
  content?: string;
  author: string;
  createdAt: string;
}

// Function to create a new annotation
export function createAnnotation(
  type: AnnotationType, 
  page: number, 
  rect: { x1: number; y1: number; x2: number; y2: number }, 
  color: string,
  author: string,
  content?: string
): Annotation {
  return {
    id: `annotation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    page,
    rect,
    color,
    content,
    author,
    createdAt: new Date().toISOString()
  };
}

// Function to format annotation date
export function formatAnnotationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Function to get color for annotation type
export function getAnnotationColor(type: AnnotationType, defaultColor = '#FFEB3B'): string {
  const colors = {
    [AnnotationType.HIGHLIGHT]: '#FFEB3B', // Yellow
    [AnnotationType.UNDERLINE]: '#4CAF50', // Green
    [AnnotationType.STRIKEOUT]: '#F44336', // Red
    [AnnotationType.NOTE]: '#2196F3', // Blue
    [AnnotationType.DRAWING]: '#9C27B0', // Purple
  };
  
  return colors[type] || defaultColor;
}
