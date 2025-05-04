/**
 * Kontrollera om en fil är en PDF baserat på filnamn eller filtyp
 */
export function isPdf(filename: string): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}

/**
 * Hämta ikon för en filtyp
 */
export function getFileIcon(filename: string): string {
  if (!filename) return 'file';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'file-text';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'image';
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
      return 'file-text';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'table';
    case 'ppt':
    case 'pptx':
      return 'presentation';
    default:
      return 'file';
  }
}