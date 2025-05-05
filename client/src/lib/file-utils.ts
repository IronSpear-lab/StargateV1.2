// Detta är en utilities-fil för filhantering

// Här spara vi temporära data för filer som laddats upp
interface StoredFile {
  id: string;
  name: string;
  file: File;
  url?: string;
  mimeType?: string;
  size?: number;
  lastModified?: number;
  lastAccessed?: number;
}

// Vi använder både en global Map (för session-baserad snabb access)
// och localStorage/IndexedDB för persistent lagring mellan sessioner
const fileStorage = new Map<string, StoredFile>();

// Nyckel för att lagra filreferenser i localStorage
const FILE_MAPPING_KEY = 'pdf_file_mappings';
const FILE_BINARY_PREFIX = 'pdf_binary_';

/**
 * Kontrollera om IndexedDB är tillgängligt i webbläsaren
 */
function hasIndexedDbSupport(): boolean {
  return 'indexedDB' in window;
}

/**
 * Spara en binär blob i IndexedDB
 */
async function saveBinaryToIndexedDB(key: string, binaryData: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDbSupport()) {
      console.error("IndexedDB is not supported in this browser");
      reject(new Error("IndexedDB not supported"));
      return;
    }
    
    // Öppna (eller skapa) IndexedDB-databasen
    const request = indexedDB.open("pdf_storage_db", 1);
    
    request.onerror = (event) => {
      console.error("Error opening IndexedDB", event);
      reject(new Error("Failed to open IndexedDB"));
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Skapa object store om det inte redan finns
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      // Lagra blob-data med nyckel
      const putRequest = store.put(binaryData, key);
      
      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      putRequest.onerror = (e) => {
        console.error("Error storing binary data in IndexedDB", e);
        db.close();
        reject(new Error("Failed to store binary data"));
      };
    };
  });
}

/**
 * Hämta binär blob från IndexedDB
 */
async function getBinaryFromIndexedDB(key: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDbSupport()) {
      console.error("IndexedDB is not supported in this browser");
      reject(new Error("IndexedDB not supported"));
      return;
    }
    
    const request = indexedDB.open("pdf_storage_db", 1);
    
    request.onerror = (event) => {
      console.error("Error opening IndexedDB", event);
      reject(new Error("Failed to open IndexedDB"));
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        db.close();
        if (getRequest.result) {
          resolve(getRequest.result);
        } else {
          console.log(`No data found in IndexedDB for key: ${key}`);
          resolve(null);
        }
      };
      
      getRequest.onerror = (e) => {
        console.error("Error retrieving binary data from IndexedDB", e);
        db.close();
        reject(new Error("Failed to retrieve binary data"));
      };
    };
  });
}

/**
 * Spara en fil i localStorage/IndexedDB för persistent lagring
 */
export async function storeFileForReuse(file: File, metadata?: { [key: string]: any }): Promise<string> {
  try {
    // Använd ett unikt ID från metadata om det finns, annars generera ett nytt
    const id = metadata?.uniqueId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Spara file-objektet i det temporära minnet
    const storedFile: StoredFile = {
      id,
      name: file.name,
      file: file,
      url: URL.createObjectURL(file),
      mimeType: file.type,
      size: file.size,
      lastModified: file.lastModified,
      lastAccessed: Date.now()
    };
    
    // Spara i den temporära Map:en för snabb åtkomst
    fileStorage.set(id, storedFile);
    
    console.log(`[${Date.now()}] Storing file ${file.name} with ID: ${id}`);
    
    // För persistent lagring i IndexedDB, konvertera File till ArrayBuffer
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Lagra binärdatan i IndexedDB
      const binaryKey = `${FILE_BINARY_PREFIX}${id}`;
      await saveBinaryToIndexedDB(binaryKey, arrayBuffer);
      
      console.log(`[${Date.now()}] Stored binary data for file ${file.name} with key: ${binaryKey}`);
    } catch (error) {
      console.error(`Failed to store binary data for file ${file.name}:`, error);
    }
    
    // Spara metadata i localStorage för enkel sökning
    try {
      const storedMappings = JSON.parse(localStorage.getItem(FILE_MAPPING_KEY) || '{}');
      
      storedMappings[id] = {
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        lastModified: file.lastModified,
        lastAccessed: Date.now(),
        ...metadata
      };
      
      localStorage.setItem(FILE_MAPPING_KEY, JSON.stringify(storedMappings));
      console.log(`[${Date.now()}] Updated file mappings in localStorage`);
    } catch (error) {
      console.error("Failed to update file mapping in localStorage:", error);
    }
    
    return id;
  } catch (error) {
    console.error("Error in storeFileForReuse:", error);
    throw error;
  }
}

/**
 * Hämta en fil från persistent lagring och ladda in i minnet om den inte redan finns där
 */
export async function getStoredFileById(id: string): Promise<StoredFile | undefined> {
  // Kontrollera först om filen redan finns i minnet
  if (fileStorage.has(id)) {
    // Uppdatera senaste åtkomsttiden
    const storedFile = fileStorage.get(id)!;
    storedFile.lastAccessed = Date.now();
    return storedFile;
  }
  
  console.log(`[${Date.now()}] File not in memory, attempting to retrieve from storage: ${id}`);
  
  try {
    // Kolla först om vi har metadata för filen i localStorage
    const storedMappings = JSON.parse(localStorage.getItem(FILE_MAPPING_KEY) || '{}');
    const fileMetadata = storedMappings[id];
    
    if (!fileMetadata) {
      console.log(`[${Date.now()}] No metadata found for file with ID: ${id}`);
      return undefined;
    }
    
    // Hämta binärdatan från IndexedDB
    const binaryKey = `${FILE_BINARY_PREFIX}${id}`;
    const arrayBuffer = await getBinaryFromIndexedDB(binaryKey);
    
    if (!arrayBuffer) {
      console.log(`[${Date.now()}] No binary data found for file with ID: ${id}`);
      return undefined;
    }
    
    // Skapa ett nytt File-objekt från binärdatan
    const blob = new Blob([arrayBuffer], { type: fileMetadata.mimeType || 'application/pdf' });
    const file = new File([blob], fileMetadata.name, {
      type: fileMetadata.mimeType,
      lastModified: fileMetadata.lastModified
    });
    
    // Skapa en URL för den nya filen
    const url = URL.createObjectURL(file);
    
    // Uppdatera metadata i localStorage
    fileMetadata.lastAccessed = Date.now();
    storedMappings[id] = fileMetadata;
    localStorage.setItem(FILE_MAPPING_KEY, JSON.stringify(storedMappings));
    
    // Skapa ett nytt StoredFile-objekt för temporär lagring
    const storedFile: StoredFile = {
      id,
      name: fileMetadata.name,
      file,
      url,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size,
      lastModified: fileMetadata.lastModified,
      lastAccessed: Date.now()
    };
    
    // Spara den i temporära lagringsutrymmet
    fileStorage.set(id, storedFile);
    
    console.log(`[${Date.now()}] Successfully retrieved file from storage: ${id}`);
    return storedFile;
  } catch (error) {
    console.error(`Error retrieving file with ID ${id} from storage:`, error);
    return undefined;
  }
}

/**
 * Spara en fil i det temporära lagringsutrymmet (äldre funktion, nu använder vi storeFileForReuse istället)
 */
export function storeFile(file: File): string {
  const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const storedFile: StoredFile = {
    id,
    name: file.name,
    file: file,
    url: URL.createObjectURL(file),
    mimeType: file.type,
    size: file.size,
    lastModified: file.lastModified,
    lastAccessed: Date.now()
  };
  
  fileStorage.set(id, storedFile);
  
  // Spara också för långtidslagring
  storeFileForReuse(file).catch(err => {
    console.error("Failed to store file for reuse:", err);
  });
  
  return id;
}

/**
 * Hämta en fil från lagringutrymmet (synkron version)
 */
export function getStoredFile(id: string): StoredFile | undefined {
  // Kolla först i den tillfälliga lagringen
  const file = fileStorage.get(id);
  if (file) {
    return file;
  }
  
  // I denna synkrona version kan vi bara returnera från minnet
  // För att hämta från persistent lagring, använd getStoredFileAsync istället
  return undefined;
}

/**
 * Asynkront hämta en fil från lagringutrymmet
 */
export async function getStoredFileAsync(id: string): Promise<StoredFile | undefined> {
  // Kolla först i den tillfälliga lagringen
  const file = fileStorage.get(id);
  if (file) {
    return file;
  }
  
  // Om inte hittad, försök hämta från persistent lagring
  try {
    console.log(`[${Date.now()}] Attempting to get file from persistent storage: ${id}`);
    const storedFile = await getStoredFileById(id);
    if (storedFile) {
      console.log(`[${Date.now()}] Successfully loaded file from persistent storage: ${id}`);
      return storedFile;
    }
  } catch (err) {
    console.error(`Failed to get stored file with ID ${id}:`, err);
  }
  
  return undefined;
}

/**
 * Hämta url för en lagrad fil (synkron version)
 */
export function getStoredFileUrl(id: string): string | undefined {
  const storedFile = fileStorage.get(id);
  if (storedFile?.url) {
    return storedFile.url;
  }
  
  // I denna synkrona version kan vi bara returnera URL från minnet
  // För att hämta från persistent lagring, använd getStoredFileUrlAsync istället
  return undefined;
}

/**
 * Asynkront hämta url för en lagrad fil
 */
export async function getStoredFileUrlAsync(id: string): Promise<string | undefined> {
  const storedFile = fileStorage.get(id);
  if (storedFile?.url) {
    return storedFile.url;
  }
  
  // Försök hämta från persistent lagring om inte hittad i minnet
  try {
    console.log(`[${Date.now()}] Attempting to get file URL from persistent storage: ${id}`);
    const loadedFile = await getStoredFileById(id);
    if (loadedFile?.url) {
      console.log(`[${Date.now()}] Successfully loaded file URL from persistent storage: ${id}`);
      return loadedFile.url;
    }
  } catch (err) {
    console.error(`Failed to get stored file URL with ID ${id}:`, err);
  }
  
  return undefined;
}

/**
 * Ta bort en fil från lagringsutrymmet och frigör URL-objektet
 */
export function removeStoredFile(id: string): boolean {
  const storedFile = fileStorage.get(id);
  if (storedFile?.url) {
    URL.revokeObjectURL(storedFile.url);
  }
  
  // Ta även bort från persistent lagring
  try {
    // Ta bort från metadata
    const storedMappings = JSON.parse(localStorage.getItem(FILE_MAPPING_KEY) || '{}');
    if (storedMappings[id]) {
      delete storedMappings[id];
      localStorage.setItem(FILE_MAPPING_KEY, JSON.stringify(storedMappings));
    }
    
    // Ta bort binärdata från IndexedDB (asynkront)
    if (hasIndexedDbSupport()) {
      const binaryKey = `${FILE_BINARY_PREFIX}${id}`;
      const request = indexedDB.open("pdf_storage_db", 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        store.delete(binaryKey);
        db.close();
      };
    }
  } catch (error) {
    console.error(`Error removing file ${id} from persistent storage:`, error);
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
 * Hämta in-memory URL för uppladdad fil (synkron version)
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
 * Asynkront hämta URL för uppladdad fil
 */
export async function getUploadedFileUrlAsync(fileId: string | number): Promise<string | undefined> {
  // Om det är en strängbaserad ID, anta att det är en av våra temporärt skapade ID:n
  if (typeof fileId === 'string' && fileId.startsWith('file_')) {
    return await getStoredFileUrlAsync(fileId);
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