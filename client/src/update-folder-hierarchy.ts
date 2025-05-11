/**
 * Skript för att uppdatera mapparhierarkin i localStorage
 * Skapar relationer där mapp 2 är under mapp 1, mapp 3 under mapp 2, och mapp 4 under mapp 3
 */

export function updateFolderHierarchy(projectId: number | string): void {
  try {
    // Hämta befintliga mappar från localStorage
    const existingFolders = JSON.parse(localStorage.getItem('userCreatedFolders') || '[]');
    
    // Filtrera ut mappar från det aktuella projektet
    const projectFolders = existingFolders.filter((folder: any) => 
      folder.projectId === projectId.toString()
    );
    
    // Hitta mapparna 1, 2, 3 och 4
    const folder1 = projectFolders.find((f: any) => f.name === '1');
    const folder2 = projectFolders.find((f: any) => f.name === '2');
    const folder3 = projectFolders.find((f: any) => f.name === '3');
    const folder4 = projectFolders.find((f: any) => f.name === '4');
    
    // Kontrollera att alla mappar finns
    if (!folder1 || !folder2 || !folder3 || !folder4) {
      console.error('Kunde inte hitta alla mappar för hierarkin', { folder1, folder2, folder3, folder4 });
      return;
    }
    
    console.log('Uppdaterar mapparhierarkin för projekt', projectId);
    console.log('Mappar före uppdatering:', { folder1, folder2, folder3, folder4 });
    
    // Uppdatera parent-child relationer
    // 1 är rot (har ingen förälder)
    folder1.parentId = null;
    folder1.parent = 'Files'; // Detta anger att den ska visas direkt under Files-sektionen
    
    // 2 har 1 som förälder
    folder2.parentId = folder1.id;
    folder2.parent = folder1.name;
    
    // 3 har 2 som förälder
    folder3.parentId = folder2.id;
    folder3.parent = folder2.name;
    
    // 4 har 3 som förälder
    folder4.parentId = folder3.id;
    folder4.parent = folder3.name;
    
    // Skapa en ny array med uppdaterade mappar
    const updatedFolders = existingFolders.map((folder: any) => {
      // Om mappen är en av de vi har uppdaterat, returnera den uppdaterade versionen
      if (folder.id === folder1.id) return folder1;
      if (folder.id === folder2.id) return folder2;
      if (folder.id === folder3.id) return folder3;
      if (folder.id === folder4.id) return folder4;
      
      // Annars, behåll mappen som den är
      return folder;
    });
    
    // Spara de uppdaterade mapparna till localStorage
    localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
    
    console.log('Mapparhierarkin har uppdaterats', updatedFolders);
    
    // Meddela Sidebar att mappstrukturen har ändrats
    window.dispatchEvent(new CustomEvent('folder-structure-changed', { 
      detail: { projectId } 
    }));
    
  } catch (error) {
    console.error('Fel vid uppdatering av mapparhierarkin:', error);
  }
}