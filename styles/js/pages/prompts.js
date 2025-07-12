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
  
  let dex = await charadex.initialize.page(null, charadex.page.prompts, 
    // Data callback to process archived status and debug field names
    (data) => {
      if (data.length > 0) {
        console.log('Prompts data fields:', Object.keys(data[0]));
        console.log('First prompt sample:', data[0]);
      }
      
      for (let prompt of data) {
        // Convert archived boolean to readable status for filtering
        if (prompt.archived === true || prompt.archived === 'TRUE') {
          prompt.archived = 'Archived';
        } else {
          prompt.archived = 'Active';
        }
      }
    },
    (listData) => {
      let backgroundElement = $('.cd-prompt-background');
      if (listData.type == 'profile') {
        backgroundElement.attr('style', `background-image: url(${listData.profileArray[0].image})`);
      } else {
        backgroundElement.each(function(i) {
          const image = listData.array[i]?.image;
          $(this).attr('style', `background-image: url(${listData.array[i]?.image})`);
        });
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});