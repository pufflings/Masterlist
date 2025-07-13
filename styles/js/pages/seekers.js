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
    charadex.page.seekers,
    // Data callback to process data
    (data) => {     
      // Process data for each seekers entry
      for (let entry of data) {
        // Set name for gallery and profile
        entry.name = entry.name || '';
        // Set image: prefer Preview, then Image, then Image URL
        entry.image = entry.preview || entry.image || entry['image url'] || '';
        // Process owner link to point to inventories page
        if (entry.owner) {
          let ownerProfile = entry.owner.toLowerCase().replace(/\s+/g, '');
          entry.ownerlink = `/inventories.html?profile=${ownerProfile}`;
        }
        // Notes, Artist, Designer are passed through as-is
      }
    },
    async (listData) => {
      // Render Pufflings gallery if on a profile view
      if (listData.type === 'profile') {
        const profile = listData.profileArray[0];
        const seekerDesign = profile.design;
        if (seekerDesign) {
          // Load all Pufflings from the masterlist
          const allPufflings = await charadex.importSheet(charadex.sheet.pages.masterlist);
          // Try both 'Seeker' and 'seeker' fields
          const filteredPufflings = allPufflings.filter(p => {
            const seekerField = p.seeker;
            if (!seekerField) return false;
            const designId = String(seekerField).split(' ')[0];
            const match = charadex.tools.scrub(designId) === charadex.tools.scrub(seekerDesign);
            return match;
          });
          if (filteredPufflings.length > 0) {
            // Show the Pufflings section
            const pufflingsSection = document.getElementById('pufflings-gallery-section');
            if (pufflingsSection) pufflingsSection.style.display = '';
            // Custom config for gallery without filters/search
            const seekerPufflingsGalleryConfig = {
              ...charadex.page.masterlist,
              filters: { toggle: false, parameters: () => ({}) },
              fauxFolder: { toggle: false, folderProperty: '', parameters: [] },
              search: { toggle: false, filterToggle: false, parameters: [] },
              pagination: { toggle: false, bottomToggle: false, amount: 100 },
            };
            // Render the gallery using the masterlist config
            await charadex.initialize.page(
              filteredPufflings,
              seekerPufflingsGalleryConfig,
              null,
              null,
              false,
              'pufflings-gallery'
            );
          }
        }
      }
    }
  );
  
  charadex.tools.loadPage('.softload', 500);
  
}); 