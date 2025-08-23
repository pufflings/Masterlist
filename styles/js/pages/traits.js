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

  // Load trait-item mapping and items data
  const traitItems = await charadex.importSheet(charadex.sheet.pages.traitItems);
  const items = await charadex.importSheet(charadex.sheet.pages.items);

  // Create a mapping: { traitId: itemId }
  const traitToItem = {};
  traitItems.forEach(row => {
    // Assuming row.Trait and row.Item are in "ID Name" format
    const traitId = row.trait ? row.trait.split(" ")[0] : null;
    const itemId = row.item ? row.item.split(" ")[0] : null;
    if (traitId && itemId) traitToItem[traitId] = itemId;
  });

  let dex = await charadex.initialize.page(null, charadex.page.traits,
    // Data callback to debug field names and augment trait descriptions
    (data) => {
      // Augment each trait with item image/link if applicable
      for (let trait of data) {
        // Get trait ID (assume 'id' or 'ID' field)
        const traitId = trait.id || trait.ID || (trait.Trait ? trait.Trait.split(" ")[0] : null);
        const itemId = traitToItem[traitId];
        if (itemId) {
          // Find the item in items data
          const item = items.find(i => (i.id || i.ID || (i.Item ? i.Item.split(" ")[0] : null)) == itemId);
          if (item) {
            // Try to get image and link fields (commonly named 'image', 'img', 'thumbnail', 'link', 'url', etc.)
            const image = item.image || item.img || item.thumbnail || '';
            const name = item.Item || item.item || '';
            const profile = name.toLowerCase().replace(/\s+/g, '');
            const link = `items.html?profile=${profile}`;
            // Add an 'Item' field to the trait for rendering
            trait.Item = `<a href="${link}"><img src="${image}" alt="${name}" style="max-width:32px;max-height:32px;vertical-align:middle;"/> <span style="vertical-align:middle;">${name}</span></a>`;
          }
        }
      }
    },
    // List callback for profile rendering
    (listData) => {
      // If this is a profile view, show the related item if present
      if (listData.type === 'profile' && listData.profileArray && listData.profileArray[0]) {
        const trait = listData.profileArray[0];
        $("#related-item-row").show();
        if (trait.Item) {
          $("#related-item-row .related-item").html(trait.Item);
        } else {
          $("#related-item-row .related-item").html('-');
        }
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});