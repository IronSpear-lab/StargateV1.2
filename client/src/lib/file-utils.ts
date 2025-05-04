// Detta är en utilities-fil för filhantering

// Här spara vi temporära data för filer som laddats upp
interface StoredFile {
  id: string;
  name: string;
  file: File;
  url?: string;
}

// Vi använder en global Map-struktur för att lagra fildata temporärt
// I en produktionsversion skulle detta ersättas med en korrekt lagring på servern
const fileStorage = new Map<string, StoredFile>();

/**
 * Spara en fil i det temporära lagringsutrymmet
 */
export function storeFile(file: File): string {
  const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const storedFile: StoredFile = {
    id,
    name: file.name,
    file: file,
    url: URL.createObjectURL(file),
  };
  
  fileStorage.set(id, storedFile);
  return id;
}

/**
 * Hämta en fil från lagringutrymmet
 */
export function getStoredFile(id: string): StoredFile | undefined {
  return fileStorage.get(id);
}

/**
 * Hämta url för en lagrad fil
 */
export function getStoredFileUrl(id: string): string | undefined {
  const storedFile = fileStorage.get(id);
  return storedFile?.url;
}

/**
 * Ta bort en fil från lagringsutrymmet och frigör URL-objektet
 */
export function removeStoredFile(id: string): boolean {
  const storedFile = fileStorage.get(id);
  if (storedFile?.url) {
    URL.revokeObjectURL(storedFile.url);
  }
  return fileStorage.delete(id);
}

/**
 * Lagra alla filer i en array och returnera deras ID:n
 */
export function storeFiles(files: File[]): string[] {
  return files.map(file => storeFile(file));
}

/**
 * Ta bort alla lagrade filer och frigör minne
 */
export function clearFileStorage(): void {
  fileStorage.forEach((storedFile) => {
    if (storedFile.url) {
      URL.revokeObjectURL(storedFile.url);
    }
  });
  fileStorage.clear();
}

/**
 * Genererar en dummy-URL för filerna i mock-data
 * För demonstration endast, returnerar en statisk länk till en exempel-PDF
 */
export function getDummyFileUrl(): string {
  return '/exampleFiles/demo.pdf';
}

/**
 * Hämta in-memory URL för uppladdad fil
 */
export function getUploadedFileUrl(fileId: string | number): string | undefined {
  // Om det är en strängbaserad ID, anta att det är en av våra temporärt skapade ID:n
  if (typeof fileId === 'string' && fileId.startsWith('file_')) {
    return getStoredFileUrl(fileId);
  }
  
  // Annars är det förmodligen ett mock-id eller ett id från databasen
  return getDummyFileUrl();
}

/**
 * Hämta filändelse från filnamn
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Kontrollera om filen är av en viss typ
 */
export function isFileOfType(filename: string, types: string[]): boolean {
  const extension = getFileExtension(filename);
  return types.includes(extension);
}

/**
 * Formattera filstorlek till läsbar form
 */
export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return sizeInBytes + ' B';
  } else if (sizeInBytes < 1024 * 1024) {
    return (sizeInBytes / 1024).toFixed(1) + ' KB';
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}