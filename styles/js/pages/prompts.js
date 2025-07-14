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
      for (let prompt of data) {
        // Convert archived boolean to readable status for filtering
        if (prompt.archived === true || prompt.archived === 'TRUE') {
          prompt.archived = 'Archived';
        } else {
          prompt.archived = 'Active';
        }
        
        // Add the folder property for fauxfolders to work correctly
        // This ensures the folder system uses the processed 'Active'/'Archived' values
        prompt.folder = prompt.archived;
      }
      
      // Handle custom filtering for "All" folder
      const urlParams = charadex.url.getUrlParametersObject();
      if (urlParams && urlParams.folder === 'All') {
        // Remove the folder parameter so no filtering is applied
        delete urlParams.folder;
        // Update the URL without the folder parameter
        const newUrl = charadex.url.addUrlParameters(window.location.pathname, urlParams);
        if (newUrl !== window.location.pathname + window.location.search) {
          window.history.replaceState({}, '', newUrl);
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
      
      // Ensure data-folder attribute is set for CSS targeting on the correct card element
      if (listData.type == 'gallery') {
        setTimeout(() => {
          listData.array.forEach((prompt) => {
            if (prompt.folder) {
              $('.col-md-6.p-2 > .card.h-100').each(function () {
                const titleLink = $(this).find('.card-header a');
                if (titleLink.text().trim() === (prompt.title || '').trim()) {
                  $(this).attr('data-folder', prompt.folder);
                  // Add fade class if archived
                  if (prompt.folder === 'Archived') {
                    $(this).addClass('shop-card-fade');
                  } else {
                    $(this).removeClass('shop-card-fade');
                  }
                }
              });
            }
          });
        }, 100);
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});