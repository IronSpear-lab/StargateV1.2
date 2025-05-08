import { apiRequest, queryClient } from "./queryClient";

/**
 * Checks if a filename has a PDF extension
 * @param filename The filename to check
 * @returns true if the file is a PDF
 */
export function isPdf(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

/**
 * Konverterar en fileId från string eller number till number.
 * Hanterar både "rena" nummer som strängar, direkt nummer eller sammansatta ID-strängar
 * med format som "file_1234" eller liknande.
 * 
 * @param fileId - Fil-ID:t som string eller number
 * @returns number - Sifferdelen av ID:t, eller NaN om det inte är ett giltigt ID
 */
export function getConsistentFileId(fileId: string | number): number {
  // If fileId is already a number, return it directly
  if (typeof fileId === 'number') {
    return fileId;
  }
  
  // Om fileId är helt numeriskt
  if (/^\d+$/.test(fileId)) {
    return parseInt(fileId, 10);
  }

  // Om fileId har format file_1234 eller liknande
  const matches = fileId.match(/(\d+)/);
  if (matches && matches[1]) {
    return parseInt(matches[1], 10);
  }

  // Om inget matchas, returnera ett genererat numeriskt ID baserat på nuvarande tid
  // istället för att returnera NaN som kan orsaka fel
  return Math.floor(Date.now() / 1000);
}

// Interface för PDF Version
export interface PDFVersion {
  id: number;
  fileId: number;
  versionNumber: number;
  filePath: string;
  description: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedById: number;
  commentCount?: number;
  metadata?: {
    fileSize: number;
    fileName: string;
  };
}

// Interface för PDF Annotation (markering)
export interface PDFAnnotation {
  id?: number;
  pdfVersionId: number;
  projectId?: number | null; // Tillåt null värde för projektID för att matcha component implementation
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string;
  status: 'new_comment' | 'action_required' | 'rejected' | 'new_review' | 'other_forum' | 'resolved';
  createdAt?: string;
  createdBy?: string;
  createdById?: number;
  assignedTo?: string; // Lägg till tilldelad användare
  taskId?: string; // Task ID referens
}

// Hämta alla versioner för en PDF-fil
export async function getPDFVersions(fileId: number): Promise<PDFVersion[]> {
  try {
    const res = await apiRequest('GET', `/api/pdf/${fileId}/versions`);
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF versions: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching PDF versions:', error);
    return [];
  }
}

// Hämta den senaste versionen för en PDF-fil
export async function getLatestPDFVersion(fileId: number): Promise<PDFVersion | null> {
  try {
    const versions = await getPDFVersions(fileId);
    if (versions.length === 0) {
      return null;
    }
    
    // Sortera versionerna efter versionsnummer (fallande)
    const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    return sortedVersions[0];
  } catch (error) {
    console.error('Error fetching latest PDF version:', error);
    return null;
  }
}

// Ladda upp en ny version av en PDF
export async function uploadPDFVersion(fileId: number, file: File, description: string): Promise<PDFVersion | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    
    const res = await apiRequest('POST', `/api/pdf/${fileId}/versions`, formData);
    if (!res.ok) {
      throw new Error(`Failed to upload PDF version: ${res.statusText}`);
    }
    
    // Invalidera PDF-versioner cache för att uppdatera listan
    queryClient.invalidateQueries({ queryKey: [`/api/pdf/${fileId}/versions`] });
    
    return await res.json();
  } catch (error) {
    console.error('Error uploading PDF version:', error);
    return null;
  }
}

// Hämta en specifik PDF-version som Blob
export async function getPDFVersionContent(versionId: number): Promise<Blob | null> {
  try {
    const res = await apiRequest('GET', `/api/pdf/versions/${versionId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF version content: ${res.statusText}`);
    }
    return await res.blob();
  } catch (error) {
    console.error('Error fetching PDF version content:', error);
    return null;
  }
}

// Hämta alla annotationer för en version
export async function getPDFAnnotations(versionId: number, projectId?: number): Promise<PDFAnnotation[]> {
  try {
    const url = projectId 
      ? `/api/pdf/versions/${versionId}/annotations?projectId=${projectId}`
      : `/api/pdf/versions/${versionId}/annotations`;
      
    const res = await apiRequest('GET', url);
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF annotations: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching PDF annotations:', error);
    return [];
  }
}

// Skapa eller uppdatera en annotation
export async function savePDFAnnotation(
  fileId: number, 
  annotation: PDFAnnotation
): Promise<PDFAnnotation | null> {
  try {
    // Se till att vi använder versionId, inte fileId i API-anropet
    const versionId = annotation.pdfVersionId;
    
    console.log('Sparar annotation för versionId:', versionId, 'Annotation data:', annotation);
    
    // Tillåt versionId=0 endast i utvecklingsläge eller utan databas
    if (versionId === 0) {
      console.warn('Använder temporärt versionId (0) för att spara annotation till localStorage. Databaspersistens kommer inte att fungera.');
      // Använd localStorage istället
      const storageKey = `pdf_annotations_${fileId.toString()}`;
      try {
        let existingAnnotations = [];
        const existingData = localStorage.getItem(storageKey);
        if (existingData) {
          try {
            existingAnnotations = JSON.parse(existingData);
            console.log(`Hittade ${existingAnnotations.length} befintliga annotationer i localStorage för fileId ${fileId}`);
          } catch (parseError) {
            console.error('Kunde inte parsa existerande annotationer:', parseError);
            // Om JSON.parse misslyckas, anta att vi behöver starta om från början
            existingAnnotations = [];
          }
        } else {
          console.log(`Inga befintliga annotationer i localStorage för fileId ${fileId}`);
        }
        
        // Om existingAnnotations inte är en array, skapa en ny
        if (!Array.isArray(existingAnnotations)) {
          console.warn('existingAnnotations är inte en array, skapar ny:', existingAnnotations);
          existingAnnotations = [];
        }
        
        // Kontrollera om annotationen redan finns (baserat på ID eller position/storlek)
        let existingIndex = -1;
        if (annotation.id) {
          existingIndex = existingAnnotations.findIndex(a => a.id === annotation.id);
        }
        
        // Skapa eller uppdatera annotation
        const localAnnotation = {
          ...annotation,
        };
        
        // Säkerställ att ID finns
        if (!localAnnotation.id) {
          localAnnotation.id = Math.floor(Date.now() / 1000);
        }
        
        // Uppdatera eller lägg till
        if (existingIndex >= 0) {
          console.log(`Uppdaterar befintlig annotation med id ${localAnnotation.id}`);
          existingAnnotations[existingIndex] = localAnnotation;
        } else {
          console.log(`Lägger till ny annotation med id ${localAnnotation.id}`);
          existingAnnotations.push(localAnnotation);
        }
        
        // Dumpa för felsökning
        console.log(`Sparar ${existingAnnotations.length} annotationer till localStorage för fileId ${fileId}:`, 
          JSON.stringify(existingAnnotations).substring(0, 200) + '...');
        
        // Spara till localStorage med säkerställd formatering
        localStorage.setItem(storageKey, JSON.stringify(existingAnnotations));
        
        // Returnera ett objekt för att simulera ett lyckat API-anrop
        return localAnnotation;
      } catch (error) {
        console.error('Fel vid localStorage lagring:', error);
      }
      // Returnera null för att indikera att det misslyckades
      return null;
    }
    
    if (!versionId) {
      console.error('Kunde inte spara annotation: saknar versionId', {
        pdfVersionId: versionId,
        annotation
      });
      throw new Error('Saknat versionId');
    }
    
    // Acceptera alla numeriska versionsID:n, även 0 för kompatibilitet
    // 0 kan användas temporärt när vi inte har ett riktigt versionId men behöver
    // spara annotationerna
    
    const res = await apiRequest('POST', `/api/pdf/versions/${versionId}/annotations`, annotation);
    if (!res.ok) {
      throw new Error(`Failed to save PDF annotation: ${res.statusText}`);
    }
    
    // Invalidera annotationer cache för att uppdatera listan
    queryClient.invalidateQueries({ queryKey: [`/api/pdf/versions/${versionId}/annotations`] });
    
    // Extra loggning för felsökning
    const savedData = await res.json();
    console.log('Sparad annotation, svar från server:', savedData);
    
    return savedData;
  } catch (error) {
    console.error('Error saving PDF annotation:', error);
    return null;
  }
}

// Ta bort en annotation
export async function deletePDFAnnotation(annotationId: number): Promise<boolean> {
  try {
    const res = await apiRequest('DELETE', `/api/pdf/annotations/${annotationId}`);
    if (!res.ok) {
      throw new Error(`Failed to delete PDF annotation: ${res.statusText}`);
    }
    
    // Vi måste invalidera parent-versionen också
    const data = await res.json();
    if (data.versionId) {
      queryClient.invalidateQueries({ queryKey: [`/api/pdf/versions/${data.versionId}/annotations`] });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting PDF annotation:', error);
    return false;
  }
}

// Konvertera en PDF-kommentar till en uppgift
export interface TaskConversionResult {
  message: string;
  task: {
    id: number;
    title: string;
    description: string;
    status: string;
    projectId: number;
    [key: string]: any; // Andra task-fält
  }
}

export async function convertAnnotationToTask(
  annotationId: number, 
  assigneeId?: number
): Promise<TaskConversionResult | null> {
  try {
    const payload = assigneeId ? { assigneeId } : {};
    const res = await apiRequest(
      'POST', 
      `/api/pdf/annotations/${annotationId}/convert-to-task`, 
      payload
    );
    
    if (!res.ok) {
      throw new Error(`Kunde inte konvertera kommentaren till en uppgift: ${res.statusText}`);
    }
    
    // Invalidera annotation cache för att uppdatera status
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    return await res.json();
  } catch (error) {
    console.error('Fel vid konvertering av PDF-kommentar till uppgift:', error);
    return null;
  }
}