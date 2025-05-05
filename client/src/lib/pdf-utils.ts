/**
 * Kontrollera om en fil är en PDF baserat på filnamn eller filtyp
 */
export function isPdf(filename: string): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}

/**
 * Generera ett konsekvent filID baserat på filnamn
 * Detta säkerställer att samma fil alltid får samma ID oavsett när den laddas
 */
export function getConsistentFileId(filename: string): string {
  if (!filename) return 'unknown_file';
  
  // Normalisera filnamnet (ta bort mellanslag, lowercase)
  const canonicalFileName = filename.replace(/\s+/g, '_').toLowerCase();
  
  // Använd en enkel checksumma för att skapa en deterministisk ID
  const simpleHash = Array.from(canonicalFileName)
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
    .toString(16)
    .substring(0, 8);
  
  return `file_${canonicalFileName}_${simpleHash}`;
}

/**
 * Automatiskt välja rätt version av PDF (den senaste)
 * Returnerar URL för den senaste versionen
 */
export function getLatestPdfVersion(filename: string): string | null {
  if (!filename) return null;
  
  try {
    // Få konsekvent filId
    const consistentFileId = getConsistentFileId(filename);
    
    // Normalisera filnamnet
    const canonicalFileName = filename.replace(/\s+/g, '_').toLowerCase();
    
    // Hämta eventuella versioner som finns för denna fil
    const versionsKey = `pdf_versions_${canonicalFileName}_${consistentFileId}`;
    const versionData = localStorage.getItem(versionsKey);
    
    if (versionData) {
      const versions = JSON.parse(versionData);
      if (Array.isArray(versions) && versions.length > 0) {
        // Sortera versionerna baserat på versionsnummer, högst först
        const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
        
        // Hämta den senaste versionen och dess URL
        const latestVersion = sortedVersions[0];
        return latestVersion.fileUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting latest PDF version:", error);
    return null;
  }
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

/**
 * Lägg till CSS för animationer i PDF-visaren
 */
export function addPdfViewerAnimations() {
  // Skapa en stil för bounce-animation om den inte redan finns
  if (!document.getElementById('pdf-viewer-animations')) {
    const style = document.createElement('style');
    style.id = 'pdf-viewer-animations';
    style.textContent = `
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-20px);
        }
        60% {
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}