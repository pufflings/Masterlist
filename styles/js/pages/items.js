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

  // Load trait-item mapping and traits data
  const traitItems = await charadex.importSheet(charadex.sheet.pages.traitItems);
  const traits = await charadex.importSheet(charadex.sheet.pages.traits);

  // Create a mapping: { itemId: traitId }
  const itemToTrait = {};
  traitItems.forEach(row => {
    const itemId = row.item ? row.item.split(" ")[0] : null;
    const traitId = row.trait ? row.trait.split(" ")[0] : null;
    if (itemId && traitId) itemToTrait[itemId] = traitId;
  });

  let dex = await charadex.initialize.page(null, charadex.page.items,
    null,
    // List callback for profile rendering
    (listData) => {
      if (listData.type === 'profile' && listData.profileArray && listData.profileArray[0]) {
        const item = listData.profileArray[0];
        
        // Handle Tradeable field
        const tradeable = item.tradeable || item.Tradeable || '';
        let tradeableText = 'No';
        if (tradeable === true || tradeable === "true" || tradeable === 1 || tradeable === "1" || tradeable === "yes" || tradeable === "Yes") {
          tradeableText = 'Yes';
        }
        $(".tradeable").text(tradeableText);
        
        const itemType = item.type || item.Type || '';
        if (itemType.trim().toLowerCase() === 'trait') {
          // Find related trait
          const itemId = item.id || item.ID || (item.Item ? item.Item.split(" ")[0] : null);
          const traitId = itemToTrait[itemId];
          if (traitId) {
            // Find the trait in traits data
            const trait = traits.find(t => (t.id || t.ID || (t.trait ? t.trait.split(" ")[0] : null)) == traitId);
            if (trait) {
              const traitName = trait.trait || trait.Trait || '';
              const profile = traitName.toLowerCase().replace(/\s+/g, '');
              const link = `traits.html?profile=${profile}`;
              const image = trait.image || trait.img || trait.thumbnail || '';
              let iconHtml = image ? `<img src="${image}" alt="${traitName}" style="max-width:32px;max-height:32px;vertical-align:middle;"/> ` : '';
              $("#related-trait-row").show();
              $("#related-trait-row .related-trait-label").text('Related trait');
              $("#related-trait-row .related-trait").html(`${iconHtml}<a href="${link}">${traitName}</a>`);
            } else {
              $("#related-trait-row").show();
              $("#related-trait-row .related-trait-label").text('');
              $("#related-trait-row .related-trait").html('-');
            }
          } else {
            $("#related-trait-row").show();
            $("#related-trait-row .related-trait-label").text('');
            $("#related-trait-row .related-trait").html('-');
          }
        } else {
          $("#related-trait-row .related-trait-label").text('');
          $("#related-trait-row").hide();
        }
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});