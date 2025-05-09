// Kod att köra i webbkonsolen för att ta bort alla mappar
// Kopiera allt och klistra in i webbkonsolen (F12) och tryck Enter

// Rensa localStorage
localStorage.removeItem('userCreatedFolders');

// Utlös uppdateringseventen för att uppdatera sidofältet
window.dispatchEvent(new CustomEvent('folder-structure-changed'));

// Rapportera att åtgärden är klar
console.log('Alla mappar har tagits bort');
alert('Alla mappar har tagits bort. Sidan kommer att laddas om.');

// Ladda om sidan för att visa ändringarna
location.reload();