import { apiRequest, queryClient } from "./queryClient";

/**
 * Checks if a filename has a PDF extension
 * @param filename The filename to check
 * @returns true if the file is a PDF
 */
export function isPdf(filename: string): boolean {
  return /\.pdf$/i.test(filename);
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
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string;
  status: 'open' | 'resolved' | 'action_required' | 'reviewing';
  createdAt?: string;
  createdBy?: string;
  createdById?: number;
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
export async function getPDFAnnotations(versionId: number): Promise<PDFAnnotation[]> {
  try {
    const res = await apiRequest('GET', `/api/pdf/versions/${versionId}/annotations`);
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
  versionId: number, 
  annotation: PDFAnnotation
): Promise<PDFAnnotation | null> {
  try {
    const res = await apiRequest('POST', `/api/pdf/versions/${versionId}/annotations`, annotation);
    if (!res.ok) {
      throw new Error(`Failed to save PDF annotation: ${res.statusText}`);
    }
    
    // Invalidera annotationer cache för att uppdatera listan
    queryClient.invalidateQueries({ queryKey: [`/api/pdf/versions/${versionId}/annotations`] });
    
    return await res.json();
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