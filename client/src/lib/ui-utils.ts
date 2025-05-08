// PDF Viewer UI Utilities

/**
 * Format date to a readable string, handling invalid dates gracefully
 * @param dateInput The date input (string, Date, or null/undefined)
 * @returns Formatted date string or a fallback string for invalid dates
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) {
    return "Inget datum";
  }
  
  try {
    // Convert to Date object if it's a string
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Verify that the date is valid before formatting
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date encountered:', dateInput);
      return "Ogiltigt datum";
    }
    
    // Format the date to a readable string
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error, dateInput);
    return "Kunde inte formatera datum";
  }
}

/**
 * Generates a consistent file ID from file metadata
 * @param file File object, metadata or filename string
 */
export function getConsistentFileId(file: File | { name: string, size: number, lastModified?: number } | string): string {
  // If the input is just a string (filename), create a simple object with name property
  if (typeof file === 'string') {
    file = { name: file, size: 0 };
  }
  
  const fileName = file.name;
  const fileSize = 'size' in file ? file.size : 0;
  const lastModified = 'lastModified' in file ? file.lastModified : Date.now();
  
  // Create a reasonably unique ID based on file properties
  return `file_${Date.now()}_${fileSize.toString(36)}_${btoa(fileName).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
}

/**
 * Adds smooth animations to the PDF viewer
 * @param element The element to animate
 */
export function addPdfViewerAnimations(element: HTMLElement): void {
  if (!element) return;
  
  // Add transition for smooth zoom
  element.style.transition = 'transform 0.2s ease-out';
  
  // Remove transition after animation is complete to avoid lag during interactions
  const removeTransition = () => {
    element.style.transition = '';
  };
  
  element.addEventListener('transitionend', removeTransition);
  setTimeout(removeTransition, 300); // Fallback in case the event doesn't fire
}

/**
 * Centers an element in the viewport
 * @param element The element to center
 * @param container The container element
 */
export function centerElementInView(element: HTMLElement, container: HTMLElement): void {
  if (!element || !container) return;
  
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  // Calculate the center position
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;
  
  // Calculate the scroll position
  const scrollX = centerX - containerRect.width / 2;
  const scrollY = centerY - containerRect.height / 2;
  
  // Scroll to the center
  container.scrollLeft = scrollX;
  container.scrollTop = scrollY;
}