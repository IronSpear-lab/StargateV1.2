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
      
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.1);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0.8;
        }
      }
      
      .pdfViewerContainer {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: auto;
      }
      
      .pdfPage {
        margin: 200px !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      /* Lägg till specifika styling för annotation marker */
      .annotation-marker {
        position: absolute;
        z-index: 1000;
        border: 4px solid #fa5c7c;
        background-color: rgba(250, 92, 124, 0.2);
        border-radius: 4px;
        pointer-events: none;
        animation: pulse 2s ease-in-out infinite;
        box-shadow: 0 0 15px rgba(250, 92, 124, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Centrera på ett element med ID i en scrollande container
 * @param elementId Element ID att centrera på
 * @param containerId Container element ID som innehåller det scrollbara innehållet
 * @param options Extra alternativ för centrering
 */
export function centerElementInView(
  elementId: string, 
  containerId: string, 
  options: { 
    smooth?: boolean, 
    addMarker?: boolean, 
    markerDuration?: number 
  } = {}
) {
  const { smooth = true, addMarker = true, markerDuration = 3000 } = options;
  
  // Säkerställ att CSS-animationerna finns
  addPdfViewerAnimations();
  
  try {
    const element = document.getElementById(elementId);
    const container = document.getElementById(containerId);
    
    if (!element || !container) {
      console.error("Could not find element or container for centering:", { elementId, containerId });
      return false;
    }
    
    // Beräkna elementets position relativt till containern
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Beräkna scroll-position för att centrera elementet
    const scrollX = element.offsetLeft - container.offsetLeft - (containerRect.width - elementRect.width) / 2;
    const scrollY = element.offsetTop - container.offsetTop - (containerRect.height - elementRect.height) / 2;
    
    // Utför scrollningen
    container.scrollTo({
      left: Math.max(0, scrollX),
      top: Math.max(0, scrollY),
      behavior: smooth ? 'smooth' : 'auto'
    });
    
    // Lägg till en temporär visuell markör om önskat
    if (addMarker) {
      const marker = document.createElement('div');
      marker.className = 'annotation-marker';
      marker.style.left = `${element.offsetLeft}px`;
      marker.style.top = `${element.offsetTop}px`;
      marker.style.width = `${elementRect.width}px`;
      marker.style.height = `${elementRect.height}px`;
      
      element.parentElement?.appendChild(marker);
      
      // Ta bort markören efter angiven tid
      setTimeout(() => {
        if (marker.parentElement) {
          marker.parentElement.removeChild(marker);
        }
      }, markerDuration);
    }
    
    return true;
  } catch (error) {
    console.error("Error centering element in view:", error);
    return false;
  }
}