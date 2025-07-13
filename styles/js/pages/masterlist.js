/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {

  // Load options from sheet first
  await charadex.loadOptions();

  let dex = await charadex.initialize.page(
    null,
    charadex.page.masterlist,
    // Data callback to debug field names and process traits
    (data) => {
      // Process traits for each masterlist entry
      for (let entry of data) {
        entry.masterlistTraits = entry.masterlisttraits;
        if (charadex.tools.checkArray(entry.masterlistTraits)) {
          // Filter out hidden traits
          let visibleTraits = entry.masterlistTraits.filter(trait => !trait.hide || trait.hide.toLowerCase() !== 'true');
          
          // Format traits for display as a list of links
          let traitsHtml = '';
          if (visibleTraits.length > 0) {
            traitsHtml = '<ul style="padding-left: 1.2em; margin-bottom: 0;">';
            for (let trait of visibleTraits) {
              if (trait.trait) {
                // Split "ID NAME" to get just the name
                let parts = trait.trait.split(' ');
                let traitName = parts.slice(1).join(' ');
                let profile = traitName.toLowerCase().replace(/\s+/g, '');
                let note = trait.notes ? ` - ${trait.notes}` : '';
                traitsHtml += `<li><a href="/traits.html?profile=${profile}">${traitName}</a>${note}</li>`;
              }
            }
            traitsHtml += '</ul>';
          } else {
            traitsHtml = '<em>No traits listed</em>';
          }
          entry.traits = traitsHtml;
        } else {
          entry.traits = '<em>No traits listed</em>';
        }
        
        // Process owner link to point to inventories page
        if (entry.owner) {
          let ownerProfile = entry.owner.toLowerCase().replace(/\s+/g, '');
          entry.ownerlink = `/inventories.html?profile=${ownerProfile}`;
        }
        // Process seeker link if present
        if (entry.seeker) {
          // Split into design and name
          let parts = entry.seeker.split(/\s+/, 2);
          let design = parts[0];
          let name = entry.seeker.substring(design.length).trim();
          entry.seekerlink = `/seekers.html?profile=${encodeURIComponent(design)}`;
          entry.seekername = name || entry.seeker;
        }
      }
    },
    async (listData) => {

      if (listData.type == 'profile') {

        // Create the log dex
        if (charadex.tools.checkArray(listData.profileArray[0].masterlistlog)) {
          let logs = await charadex.initialize.page(
            listData.profileArray[0].masterlistlog,
            charadex.page.masterlist.relatedData['masterlist log']
          );
        }

        // Directly update the Seeker row in the DOM
        const data = listData.profileArray[0];
        if (data && data.seekername && data.seekerlink) {
          var row = document.querySelector('.seeker-row');
          if (row) {
            row.style.display = '';
            var link = row.querySelector('.seekerlink');
            link.textContent = data.seekername;
            link.href = data.seekerlink;
          }
        }
      }

    }
  );
  
  charadex.tools.loadPage('.softload', 500);
  
});