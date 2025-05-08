import * as pdfjs from 'pdfjs-dist';

/**
 * Konfigurerar PDF.js arbetarprocessen med en korrekt väg till worker.js filen.
 * Detta måste göras innan PDF.js används för att undvika laddningsfel.
 */
export function configurePdfWorker() {
  // Kontrollera om det redan är konfigurerat
  if (GlobalWorkerOptions.workerSrc) {
    console.log('PDF.js worker redan konfigurerad:', GlobalWorkerOptions.workerSrc);
    return;
  }

  // Försök hitta en arbetarprocess URL
  try {
    // Det här är standardpaketet som används i Vite/Webpack projekt
    const workerUrl = new URL(
      'pdfjs-dist/build/pdf.worker.min.js', 
      import.meta.url
    ).toString();
    
    // Ange arbetarprocessen
    GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF.js worker konfigurerad:', workerUrl);
  } catch (error) {
    console.error('Kunde inte konfigurera PDF.js worker:', error);
    
    // Fallback till CDN om import.meta.url inte fungerar
    try {
      const cdnWorkerUrl = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';
      GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
      console.log('PDF.js worker konfigurerad med CDN fallback:', cdnWorkerUrl);
    } catch (fallbackError) {
      console.error('Kunde inte konfigurera PDF.js worker med fallback:', fallbackError);
    }
  }
}

/**
 * Aktiverar en alternativ laddningsmetod för PDF-filer som kan undvika vissa vanliga fel.
 * Detta kan köras om standardmetoden misslyckas.
 */
export function configureAlternativePdfLoading() {
  // Stäng av arbetarprocessen om den inte fungerar korrekt
  try {
    const cdnWorkerUrl = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';
    GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    console.log('PDF.js alternativ worker konfigurerad:', cdnWorkerUrl);
  } catch (error) {
    console.error('Kunde inte konfigurera alternativ PDF.js worker:', error);
  }
}