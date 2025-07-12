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
  
  let dex = await charadex.initialize.page(null, charadex.page.traits,
    // Data callback to debug field names
    (data) => {
      if (data.length > 0) {
        console.log('Traits data fields:', Object.keys(data[0]));
        console.log('First trait sample:', data[0]);
        for (let prompt of data) {
          console.log('Prompt:', prompt.title, 'archived:', prompt.archived);
        }
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});