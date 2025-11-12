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
    charadex.page.inventory,
    null, 
    async (listData) => {

      if (listData.type == 'profile') {

        let profile = listData.profileArray[0];

        // Inventory
        const inventoryData = (await charadex.manageData.inventoryFix(profile)).filter(item => Number(item.quantity) > 0);
        charadex.initialize.groupGallery(
          charadex.page.inventory.inventoryConfig,
          inventoryData,
          'type',
          charadex.url.getPageUrl('items')
        )

        // Designs
        if (charadex.tools.checkArray(profile.pufflings)) {
          let designs = await charadex.initialize.page(
            profile.pufflings,
            charadex.page.inventory.relatedData[charadex.sheet.pages.masterlist],
          );
        }

        // Seekers
        if (charadex.tools.checkArray(profile.seekers)) {
          let seekers = await charadex.initialize.page(
            profile.seekers,
            charadex.page.inventory.relatedData[charadex.sheet.pages.seekers],
          );
        }

        // Logs
        if (charadex.tools.checkArray(profile.inventorylog)) {
          const logsDescending = [...profile.inventorylog].reverse();
          await charadex.initialize.page(
            logsDescending,
            charadex.page.inventory.relatedData[charadex.sheet.pages.inventoryLog],
          );
        }


      }
    }
  );
  
  charadex.tools.loadPage('.softload', 500);
  
});
