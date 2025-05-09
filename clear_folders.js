// Funktion för att ta bort alla mappar
function clearAllFolders() {
  try {
    // Hämta existerande mappar
    const existingFolders = JSON.parse(localStorage.getItem('userCreatedFolders') || '[]');
    console.log(`Hittade ${existingFolders.length} mappar att ta bort`);
    
    // Ta bort alla mappar
    localStorage.removeItem('userCreatedFolders');
    
    // Tvinga en refresh av sidebar-menyn genom att utlösa en custom event
    window.dispatchEvent(new CustomEvent('folder-structure-changed'));
    
    return `Alla ${existingFolders.length} mappar har tagits bort. Ladda om sidan för att se ändringen.`;
  } catch (error) {
    console.error('Fel vid borttagning av mappar:', error);
    return 'Ett fel uppstod vid borttagning av mappar: ' + error.message;
  }
}