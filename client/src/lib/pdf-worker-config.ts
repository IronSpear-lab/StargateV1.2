import { pdfjs } from 'react-pdf';

/**
 * Konfigurerar PDF.js arbetarprocessen med en korrekt väg till worker.js filen.
 * Detta måste göras innan PDF.js används för att undvika laddningsfel.
 */
export function configurePdfWorker() {
  // Kontrollera om det redan är konfigurerat
  if (pdfjs.GlobalWorkerOptions.workerSrc) {
    console.log('PDF.js worker redan konfigurerad:', pdfjs.GlobalWorkerOptions.workerSrc);
    return;
  }

  // Försök hitta en arbetarprocess URL
  try {
    // Använd CDN-länk med korrekt version
    const cdnWorkerUrl = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    console.log('PDF.js worker konfigurerad:', cdnWorkerUrl);
  } catch (error) {
    console.error('Kunde inte konfigurera PDF.js worker:', error);
    
    // Fallback till en annan CDN om cdnjs inte fungerar
    try {
      const unpkgWorkerUrl = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      pdfjs.GlobalWorkerOptions.workerSrc = unpkgWorkerUrl;
      console.log('PDF.js worker konfigurerad med alternativ CDN:', unpkgWorkerUrl);
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
  // Byt till en alternativ CDN om den första inte fungerar
  try {
    const altCdnWorkerUrl = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = altCdnWorkerUrl;
    console.log('PDF.js alternativ worker konfigurerad:', altCdnWorkerUrl);
  } catch (error) {
    console.error('Kunde inte konfigurera alternativ PDF.js worker:', error);
  }
}