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
        // Use the correct field name based on the sheet page name
        entry.masterlistTraits = entry.pufflingtraits;
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

        // Set Design Type
        const designType = data.Type || data.type || data['Design Type'] || data.designType || '';
        const designTypeElem = document.querySelector('.designtype');
        if (designTypeElem) designTypeElem.textContent = designType;

        // Debug: Log the profile data object (development only)
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          console.log('Profile data:', data);
        }

        // Render profile image(s)
        const imageContainer = document.querySelector('.cd-profile-image-container');
        if (imageContainer) {
          imageContainer.innerHTML = '';
          if (data.humanoidimage) {
            imageContainer.innerHTML = `
              <ul class="nav nav-tabs justify-content-center mb-3" id="imageTab" role="tablist">
                <li class="nav-item">
                  <a class="nav-link active" id="main-image-tab" data-toggle="tab" href="#main-image" role="tab" aria-controls="main-image" aria-selected="true">Puffling</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" id="alt-image-tab" data-toggle="tab" href="#alt-image" role="tab" aria-controls="alt-image" aria-selected="false">Humanoid</a>
                </li>
              </ul>
              <div class="tab-content" id="imageTabContent">
                <div class="tab-pane fade show active" id="main-image" role="tabpanel" aria-labelledby="main-image-tab">
                  <img class="image img-fluid" src="${data.image}">
                </div>
                <div class="tab-pane fade" id="alt-image" role="tabpanel" aria-labelledby="alt-image-tab">
                  <img class="alt-image img-fluid" src="${data.humanoidimage}">
                </div>
              </div>
            `;
          } else {
            imageContainer.innerHTML = `<img class="image img-fluid" src="${data.image}">`;
          }
        }
      }

    }
  );
  
  charadex.tools.loadPage('.softload', 500);
  
});